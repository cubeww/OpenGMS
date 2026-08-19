import { useCallback, useEffect, useRef } from 'react'
import {
  DockviewDefaultTab,
  DockviewReact,
  themeDark,
  type DockviewApi,
  type DockviewReadyEvent,
  type IDockviewPanelHeaderProps,
  type IDockviewPanelProps
} from 'dockview-react'
import type { Project } from '../../shared/types'
import { closeEditor, confirmAll } from './close'
import { BackgroundPanel, type BackgroundParams } from './panels/BackgroundPanel'
import { CodePanel } from './panels/CodePanel'
import { ConfigPanel } from './panels/ConfigPanel'
import { FontPanel, type FontParams } from './panels/FontPanel'
import { GameInfoPanel } from './panels/GameInfoPanel'
import { GlobalSettingsPanel } from './panels/GlobalSettingsPanel'
import { ExtensionPanel, type ExtensionParams } from './panels/ExtensionPanel'
import {
  ExtensionFilePanel,
  ExtensionFunctionPanel,
  type ExtensionFileParams,
  type ExtensionFunctionParams
} from './panels/ExtensionMemberPanel'
import { ImagePanel, type ImageParams } from './panels/ImagePanel'
import { MacroPanel, type MacroParams } from './panels/MacroPanel'
import { ObjectPanel, type ObjectParams } from './panels/ObjectPanel'
import { OutputPanel, type OutputTab } from './panels/OutputPanel'
import { PathPanel, type PathParams } from './panels/PathPanel'
import { PreferencesPanel } from './panels/PreferencesPanel'
import { ResourcePanel } from './panels/ResourcePanel'
import { RoomPanel, type RoomParams } from './panels/RoomPanel'
import { ScriptPanel, type ScriptParams } from './panels/ScriptPanel'
import { ShaderPanel, type ShaderParams } from './panels/ShaderPanel'
import { SoundPanel, type SoundParams } from './panels/SoundPanel'
import { SpritePanel, type SpriteParams } from './panels/SpritePanel'
import { TimelinePanel, type TimelineParams } from './panels/TimelinePanel'
import {
  matchResource,
  resourceChangeEvent,
  resourceItems,
  type ResourceChange,
  type ResourceItem
} from './resources'
import { getPref, removePref, setPref } from './prefs'
import { useApp } from './store'

function EmptyPanel(): React.JSX.Element {
  return <div className="workspace-empty" />
}

function EmptyTab(): null {
  return null
}

function blockTabDelete(event: KeyboardEvent): void {
  if (event.key !== 'Backspace' && event.key !== 'Delete') return
  const target = event.target
  if (!(target instanceof HTMLElement) || !target.classList.contains('dv-tab')) return
  event.preventDefault()
  event.stopImmediatePropagation()
}

function EditorTab(props: IDockviewPanelHeaderProps): React.JSX.Element {
  const title = (props.api.title ?? 'Resource').replace(/\s+•$/, '')
  return (
    <DockviewDefaultTab
      {...props}
      closeActionOverride={() => void closeEditor(props.api.id, title, () => props.api.close())}
    />
  )
}

function resourceEditor(
  Component: React.FunctionComponent<IDockviewPanelProps>,
  preserveOnRename = false
): React.FunctionComponent<IDockviewPanelProps> {
  return function ResourceEditor(props): React.JSX.Element {
    const item = (props.params as { item?: ResourceItem }).item
    const key = preserveOnRename ? props.api.id : item?.file ?? props.api.id
    return <Component key={key} {...props} />
  }
}

function findResourcePanel(
  api: DockviewApi,
  component: string,
  itemId: string
) {
  return api.panels.find((panel) => {
    const params = (panel.params ?? {}) as { item?: ResourceItem }
    return panel.api.component === component && params.item?.id === itemId
  })
}

function findExtensionPanel(
  api: DockviewApi,
  component: 'extensionFile' | 'extensionFunction',
  itemId: string,
  fileIndex: number,
  functionIndex?: number
) {
  return api.panels.find((panel) => {
    if (panel.api.component !== component) return false
    const params = (panel.params ?? {}) as ExtensionFunctionParams
    return params.item?.id === itemId &&
      params.fileIndex === fileIndex &&
      (functionIndex === undefined || params.functionIndex === functionIndex)
  })
}

function isResourceItem(value: unknown): value is ResourceItem {
  return Boolean(
    value &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === 'resource' &&
    typeof (value as { id?: unknown }).id === 'string'
  )
}

function nextPanelId(api: DockviewApi, base: string): string {
  if (!api.getPanel(base)) return base
  let index = 2
  while (api.getPanel(`${base}:${index}`)) index += 1
  return `${base}:${index}`
}

function syncResourcePanels(api: DockviewApi, change: ResourceChange): void {
  const previousItems = resourceItems(change.previous)
  for (const panel of [...api.panels]) {
    const params = (panel.params ?? {}) as Record<string, unknown>
    const item = params.item
    if (isResourceItem(item)) {
      const next = matchResource(change, item)
      if (!next) {
        api.removePanel(panel)
        continue
      }
      panel.update({
        params: {
          ...params,
          item: next,
          projectPath: change.project.path
        }
      })
      continue
    }

    if (panel.api.component !== 'image' || typeof params.itemId !== 'string') continue
    const previous = previousItems.find((candidate) => candidate.id === params.itemId)
    if (!previous) continue
    const next = matchResource(change, previous)
    if (!next || next.file !== previous.file) {
      api.removePanel(panel)
      continue
    }
    panel.update({
      params: {
        ...params,
        itemId: next.id,
        name: next.name,
        projectPath: change.project.path
      }
    })
  }
}

const panels: Record<string, React.FunctionComponent<IDockviewPanelProps>> = {
  resources: ResourcePanel,
  output: OutputPanel,
  code: CodePanel,
  configs: ConfigPanel,
  script: resourceEditor(ScriptPanel),
  shader: resourceEditor(ShaderPanel),
  sprite: resourceEditor(SpritePanel, true),
  sound: resourceEditor(SoundPanel, true),
  background: resourceEditor(BackgroundPanel, true),
  path: resourceEditor(PathPanel),
  preferences: PreferencesPanel,
  font: resourceEditor(FontPanel),
  gameInfo: GameInfoPanel,
  globalSettings: GlobalSettingsPanel,
  object: resourceEditor(ObjectPanel),
  timeline: resourceEditor(TimelinePanel),
  room: resourceEditor(RoomPanel),
  extension: resourceEditor(ExtensionPanel),
  extensionFile: resourceEditor(ExtensionFilePanel),
  extensionFunction: resourceEditor(ExtensionFunctionPanel),
  image: ImagePanel,
  macro: resourceEditor(MacroPanel),
  empty: EmptyPanel
}

const fixedPanels = new Set(['resources', 'output', 'workspace-empty'])
type WindowPanel = 'resources' | 'output'

function addWindowPanel(api: DockviewApi, panel: WindowPanel): void {
  if (api.getPanel(panel)) return
  const referenceGroup =
    api.getGroup('workspace') ??
    api.activeGroup ??
    api.addGroup({ id: 'workspace', hideHeader: true, direction: 'right' })
  const referenceGroupId = referenceGroup.id

  if (panel === 'resources') {
    api.addPanel({
      id: 'resources',
      component: 'resources',
      title: 'Resources',
      initialWidth: 280,
      minimumWidth: 220,
      position: { referenceGroup: referenceGroupId, direction: 'left' }
    })
    return
  }

  api.addPanel({
    id: 'output',
    component: 'output',
    title: 'Output',
    initialHeight: 190,
    minimumHeight: 110,
    position: { referenceGroup: referenceGroupId, direction: 'below' }
  })
}

function notifyWindowPanels(api: DockviewApi): void {
  window.dispatchEvent(new CustomEvent('opengms:window-panels-changed', {
    detail: {
      output: Boolean(api.getPanel('output')),
      resources: Boolean(api.getPanel('resources'))
    }
  }))
}

function addDefaultLayout(api: DockviewApi): void {
  const workspace = api.addGroup({
    id: 'workspace',
    hideHeader: true,
    direction: 'right'
  })

  api.addPanel({
    id: 'workspace-empty',
    component: 'empty',
    tabComponent: 'empty',
    title: '',
    position: { referenceGroup: workspace }
  })

  addWindowPanel(api, 'resources')
  addWindowPanel(api, 'output')
}

export function Dock(): React.JSX.Element {
  const apiRef = useRef<DockviewApi | null>(null)
  const saveRef = useRef<{ dispose: () => void } | null>(null)
  const previousProject = useRef<string | null>(null)
  const resourceProject = useRef<Project | null>(null)
  const project = useApp((state) => state.project)
  const projectPath = project?.path ?? null

  const onReady = useCallback((event: DockviewReadyEvent) => {
    const api = event.api
    apiRef.current = api

    const saved = getPref<ReturnType<DockviewApi['toJSON']> | null>('layout', null)
    if (saved) {
      try {
        api.fromJSON(saved)
      } catch {
        removePref('layout')
        addDefaultLayout(api)
      }
    } else {
      addDefaultLayout(api)
    }

    saveRef.current = api.onDidLayoutChange(() => {
      const workspace = api.getGroup('workspace')
      if (workspace) {
        const hidden = workspace.panels.every((panel) => panel.id === 'workspace-empty')
        if (workspace.model.header.hidden !== hidden) {
          workspace.model.header.hidden = hidden
          workspace.model.relayout()
        }
      }

      if (api.panels.every((panel) => fixedPanels.has(panel.id))) {
        setPref('layout', api.toJSON())
      }
      notifyWindowPanels(api)
    })
    notifyWindowPanels(api)
  }, [])

  useEffect(() => {
    if (previousProject.current && projectPath !== previousProject.current) {
      const api = apiRef.current
      if (api) {
        for (const panel of [...api.panels]) {
          if (!fixedPanels.has(panel.id)) api.removePanel(panel)
        }
      }
    }
    previousProject.current = projectPath
  }, [projectPath])

  useEffect(() => {
    const previous = resourceProject.current
    const api = apiRef.current
    if (api && previous && project && previous.path === project.path && previous !== project) {
      syncResourcePanels(api, { previous, project })
    }
    resourceProject.current = project
  }, [project])

  useEffect(() => {
    function closeActivePanel(event: KeyboardEvent): void {
      if (
        !event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey ||
        event.key.toLowerCase() !== 'w'
      ) return

      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat) return

      const panel = apiRef.current?.activePanel
      if (!panel || fixedPanels.has(panel.id)) return
      const title = (panel.api.title ?? 'Resource').replace(/\s+•$/, '')
      void closeEditor(panel.id, title, () => panel.api.close())
    }

    function workspace(api: DockviewApi): string {
      const group =
        api.getGroup('workspace') ??
        api.activeGroup ??
        api.addGroup({ id: 'workspace', direction: 'right' })
      if (group.model.header.hidden) {
        group.model.header.hidden = false
        group.model.relayout()
      }
      return group.id
    }

    function openSprite(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<SpriteParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'sprite') return
      const current = findResourcePanel(api, 'sprite', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `sprite:${item.id}`)

      api.addPanel<SpriteParams>({
        id,
        component: 'sprite',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openImage(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const params = (event as CustomEvent<ImageParams>).detail
      if (!params?.frame.image) return
      const base = `image:${params.itemId}:${params.frame.index}`
      const current = api.panels.find((panel) => {
        if (panel.api.component !== 'image') return false
        const open = (panel.params ?? {}) as ImageParams
        return open.itemId === params.itemId && open.frame.index === params.frame.index
      })
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, base)

      const parentPanel = findResourcePanel(api, params.resource, params.itemId)
      api.addPanel<ImageParams>({
        id,
        component: 'image',
        title: params.resource === 'background'
          ? `${params.name} · Image`
          : `${params.name} · Frame ${params.frame.index}`,
        params,
        position: parentPanel
          ? { referencePanel: parentPanel }
          : { referenceGroup: workspace(api) }
      })
    }

    function openSound(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<SoundParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'sound') return
      const current = findResourcePanel(api, 'sound', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `sound:${item.id}`)

      api.addPanel<SoundParams>({
        id,
        component: 'sound',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openBackground(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<BackgroundParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'background') return
      const current = findResourcePanel(api, 'background', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `background:${item.id}`)

      api.addPanel<BackgroundParams>({
        id,
        component: 'background',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openFont(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<FontParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'font') return
      const current = findResourcePanel(api, 'font', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `font:${item.id}`)

      api.addPanel<FontParams>({
        id,
        component: 'font',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openPath(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<PathParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'path' || !item.pathData) return
      const current = findResourcePanel(api, 'path', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `path:${item.id}`)

      api.addPanel<PathParams>({
        id,
        component: 'path',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openScript(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<ScriptParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'script') return
      const current = findResourcePanel(api, 'script', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `script:${item.id}`)

      api.addPanel<ScriptParams>({
        id,
        component: 'script',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openShader(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<ShaderParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'shader') return
      const current = findResourcePanel(api, 'shader', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `shader:${item.id}`)

      api.addPanel<ShaderParams>({
        id,
        component: 'shader',
        title: item.name,
        params: { item },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openObject(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<ObjectParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'object') return
      const current = findResourcePanel(api, 'object', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `object:${item.id}`)

      api.addPanel<ObjectParams>({
        id,
        component: 'object',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openTimeline(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<TimelineParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'timeline') return
      const current = findResourcePanel(api, 'timeline', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `timeline:${item.id}`)

      api.addPanel<TimelineParams>({
        id,
        component: 'timeline',
        title: item.name,
        params: { item },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openRoom(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<RoomParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'room') return
      const current = findResourcePanel(api, 'room', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `room:${item.id}`)

      api.addPanel<RoomParams>({
        id,
        component: 'room',
        title: item.name,
        params: { item, projectPath: project.path },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openExtension(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<ExtensionParams['item']>).detail
      const project = useApp.getState().project
      if (!project || !item || item.type !== 'extension') return
      const current = findResourcePanel(api, 'extension', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `extension:${item.id}`)

      api.addPanel<ExtensionParams>({
        id,
        component: 'extension',
        title: item.name,
        params: { item },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openExtensionFile(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const params = (event as CustomEvent<ExtensionFileParams>).detail
      const file = params?.item.extension?.files[params.fileIndex]
      if (!params || params.item.type !== 'extension' || !file) return
      const current = findExtensionPanel(api, 'extensionFile', params.item.id, params.fileIndex)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `extension-file:${params.item.id}:${params.fileIndex}`)
      const parent = findResourcePanel(api, 'extension', params.item.id)
      api.addPanel<ExtensionFileParams>({
        id,
        component: 'extensionFile',
        title: file.filename || `File ${params.fileIndex + 1}`,
        params,
        position: parent
          ? { referencePanel: parent }
          : { referenceGroup: workspace(api) }
      })
    }

    function openExtensionFunction(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const params = (event as CustomEvent<ExtensionFunctionParams>).detail
      const fn = params?.item.extension?.files[params.fileIndex]?.functions[params.functionIndex]
      if (!params || params.item.type !== 'extension' || !fn) return
      const current = findExtensionPanel(api, 'extensionFunction', params.item.id, params.fileIndex, params.functionIndex)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `extension-function:${params.item.id}:${params.fileIndex}:${params.functionIndex}`)
      const parent = findExtensionPanel(api, 'extensionFile', params.item.id, params.fileIndex)
        ?? findResourcePanel(api, 'extension', params.item.id)
      api.addPanel<ExtensionFunctionParams>({
        id,
        component: 'extensionFunction',
        title: fn.name || `Function ${params.functionIndex + 1}`,
        params,
        position: parent
          ? { referencePanel: parent }
          : { referenceGroup: workspace(api) }
      })
    }

    function openMacro(event: Event): void {
      const api = apiRef.current
      if (!api) return
      const item = (event as CustomEvent<MacroParams['item']>).detail
      if (!item || item.type !== 'macro' || !item.macro) return
      const current = findResourcePanel(api, 'macro', item.id)
      if (current) {
        current.api.setActive()
        return
      }
      const id = nextPanelId(api, `macro:${item.id}`)
      api.addPanel<MacroParams>({
        id,
        component: 'macro',
        title: item.name,
        params: { item },
        position: { referenceGroup: workspace(api) }
      })
    }

    function openConfigs(): void {
      const api = apiRef.current
      if (!api || !useApp.getState().project) return
      const current = api.getPanel('config-manager')
      if (current) {
        current.api.setActive()
        return
      }
      api.addPanel({
        id: 'config-manager',
        component: 'configs',
        title: 'Configurations',
        position: { referenceGroup: workspace(api) }
      })
    }

    function openGameInfo(): void {
      const api = apiRef.current
      if (!api || !useApp.getState().project) return
      const current = api.getPanel('game-information')
      if (current) {
        current.api.setActive()
        return
      }
      api.addPanel({
        id: 'game-information',
        component: 'gameInfo',
        title: 'Game Information',
        position: { referenceGroup: workspace(api) }
      })
    }

    function openGlobalSettings(): void {
      const api = apiRef.current
      if (!api || !useApp.getState().project) return
      const current = api.getPanel('global-game-settings')
      if (current) {
        current.api.setActive()
        return
      }
      api.addPanel({
        id: 'global-game-settings',
        component: 'globalSettings',
        title: 'Global Game Settings',
        position: { referenceGroup: workspace(api) }
      })
    }

    function openPreferences(): void {
      const api = apiRef.current
      if (!api) return
      const current = api.getPanel('preferences')
      if (current) {
        current.api.setActive()
        return
      }
      api.addPanel({
        id: 'preferences',
        component: 'preferences',
        title: 'Preferences',
        position: { referenceGroup: workspace(api) }
      })
    }

    function toggleWindowPanel(event: Event): void {
      const api = apiRef.current
      const panel = (event as CustomEvent<WindowPanel>).detail
      if (!api || !['resources', 'output'].includes(panel)) return
      const current = api.getPanel(panel)
      if (current) api.removePanel(current)
      else addWindowPanel(api, panel)
      notifyWindowPanels(api)
    }

    function requestWindowPanels(): void {
      const api = apiRef.current
      if (api) notifyWindowPanels(api)
    }

    function showOutputTab(tab: OutputTab): void {
      const api = apiRef.current
      if (!api) return
      addWindowPanel(api, 'output')
      api.getPanel('output')?.api.setActive()
      notifyWindowPanels(api)
      window.requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent<OutputTab>('opengms:activate-output-tab', {
          detail: tab
        }))
      })
    }

    function showOutput(): void {
      showOutputTab('Output')
    }

    function showCodeSearch(): void {
      showOutputTab('Search')
    }

    function resetLayout(): void {
      const api = apiRef.current
      if (!api) return
      void confirmAll().then((confirmed) => {
        if (!confirmed) return
        removePref('layout')
        api.clear()
        addDefaultLayout(api)
        notifyWindowPanels(api)
      })
    }

    function resourcesChanged(event: Event): void {
      const api = apiRef.current
      const change = (event as CustomEvent<ResourceChange>).detail
      if (!api || !change?.previous || !change.project) return
      syncResourcePanels(api, change)
    }

    window.addEventListener('keydown', blockTabDelete, true)
    window.addEventListener('keydown', closeActivePanel, true)
    window.addEventListener('opengms:open-sprite', openSprite)
    window.addEventListener('opengms:open-image', openImage)
    window.addEventListener('opengms:open-sound', openSound)
    window.addEventListener('opengms:open-background', openBackground)
    window.addEventListener('opengms:open-path', openPath)
    window.addEventListener('opengms:open-font', openFont)
    window.addEventListener('opengms:open-script', openScript)
    window.addEventListener('opengms:open-shader', openShader)
    window.addEventListener('opengms:open-object', openObject)
    window.addEventListener('opengms:open-timeline', openTimeline)
    window.addEventListener('opengms:open-room', openRoom)
    window.addEventListener('opengms:open-extension', openExtension)
    window.addEventListener('opengms:open-extension-file', openExtensionFile)
    window.addEventListener('opengms:open-extension-function', openExtensionFunction)
    window.addEventListener('opengms:open-macro', openMacro)
    window.addEventListener('opengms:open-configs', openConfigs)
    window.addEventListener('opengms:open-game-info', openGameInfo)
    window.addEventListener('opengms:open-global-settings', openGlobalSettings)
    window.addEventListener('opengms:open-preferences', openPreferences)
    window.addEventListener('opengms:toggle-window-panel', toggleWindowPanel)
    window.addEventListener('opengms:request-window-panels', requestWindowPanels)
    window.addEventListener('opengms:show-output', showOutput)
    window.addEventListener('opengms:show-code-search', showCodeSearch)
    window.addEventListener('opengms:reset-layout', resetLayout)
    window.addEventListener(resourceChangeEvent, resourcesChanged)

    return () => {
      saveRef.current?.dispose()
      window.removeEventListener('keydown', blockTabDelete, true)
      window.removeEventListener('keydown', closeActivePanel, true)
      window.removeEventListener('opengms:open-sprite', openSprite)
      window.removeEventListener('opengms:open-image', openImage)
      window.removeEventListener('opengms:open-sound', openSound)
      window.removeEventListener('opengms:open-background', openBackground)
      window.removeEventListener('opengms:open-path', openPath)
      window.removeEventListener('opengms:open-font', openFont)
      window.removeEventListener('opengms:open-script', openScript)
      window.removeEventListener('opengms:open-shader', openShader)
      window.removeEventListener('opengms:open-object', openObject)
      window.removeEventListener('opengms:open-timeline', openTimeline)
      window.removeEventListener('opengms:open-room', openRoom)
      window.removeEventListener('opengms:open-extension', openExtension)
      window.removeEventListener('opengms:open-extension-file', openExtensionFile)
      window.removeEventListener('opengms:open-extension-function', openExtensionFunction)
      window.removeEventListener('opengms:open-macro', openMacro)
      window.removeEventListener('opengms:open-configs', openConfigs)
      window.removeEventListener('opengms:open-game-info', openGameInfo)
      window.removeEventListener('opengms:open-global-settings', openGlobalSettings)
      window.removeEventListener('opengms:open-preferences', openPreferences)
      window.removeEventListener('opengms:toggle-window-panel', toggleWindowPanel)
      window.removeEventListener('opengms:request-window-panels', requestWindowPanels)
      window.removeEventListener('opengms:show-output', showOutput)
      window.removeEventListener('opengms:show-code-search', showCodeSearch)
      window.removeEventListener('opengms:reset-layout', resetLayout)
      window.removeEventListener(resourceChangeEvent, resourcesChanged)
    }
  }, [])

  return (
    <DockviewReact
      className="opengms-dock"
      components={panels}
      tabComponents={{ empty: EmptyTab }}
      defaultTabComponent={EditorTab}
      theme={themeDark}
      onReady={onReady}
    />
  )
}
