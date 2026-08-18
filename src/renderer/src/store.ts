import { create } from 'zustand'
import type {
  BackgroundData,
  BuildState,
  ExtensionData,
  FontData,
  MacroData,
  ObjectData,
  PathData,
  Project,
  ProjectItem,
  RoomData,
  ScriptInfo,
  ShaderData,
  SoundData,
  SpriteData,
  TimelineData
} from '../../shared/types'

export type LogKind = 'info' | 'build' | 'error'

export type AppLog = {
  text: string
  kind: LogKind
}

type AppState = {
  project: Project | null
  projectDirty: boolean
  config: string
  logs: AppLog[]
  buildState: BuildState
  loading: boolean
  error: string | null
  imageVersion: number
  startProject: () => Promise<void>
  newProject: () => Promise<Project | null>
  openProject: () => Promise<void>
  openProjectFile: (file: string) => Promise<boolean>
  setProject: (project: Project, changed?: boolean) => void
  markProjectDirty: () => void
  setConfig: (config: string) => void
  updateSprite: (id: string, sprite: SpriteData) => void
  updateSound: (id: string, sound: SoundData) => void
  updateBackground: (id: string, background: BackgroundData) => void
  updateFont: (id: string, font: FontData) => void
  updateObject: (id: string, object: ObjectData) => void
  updateTimeline: (id: string, timeline: TimelineData) => void
  updatePath: (id: string, pathData: PathData) => void
  updateRoom: (id: string, room: RoomData) => void
  updateScript: (id: string, script: ScriptInfo) => void
  updateExtension: (id: string, extension: ExtensionData) => void
  updateMacro: (id: string, macro: MacroData) => void
  updateShader: (id: string, shader: ShaderData) => void
  refreshImages: () => void
  setBuildState: (state: BuildState) => void
  addLog: (message: string, kind?: LogKind) => void
  clearLogs: () => void
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Could not open the project.'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function updateItems(
  items: ProjectItem[],
  id: string,
  data: {
    sprite?: SpriteData
    sound?: SoundData
    background?: BackgroundData
    font?: FontData
    object?: ObjectData
    timeline?: TimelineData
    pathData?: PathData
    room?: RoomData
    script?: ScriptInfo
    shader?: ShaderData
    extension?: ExtensionData
    macro?: MacroData
    shaderType?: ShaderData['type']
    image?: string
  }
): ProjectItem[] {
  return items.map((item) => {
    if (item.kind === 'group') return { ...item, items: updateItems(item.items, id, data) }
    return item.id === id ? { ...item, ...data } : item
  })
}

function findResource(items: ProjectItem[], id: string): Extract<ProjectItem, { kind: 'resource' }> | null {
  for (const item of items) {
    if (item.kind === 'group') {
      const found = findResource(item.items, id)
      if (found) return found
    } else if (item.id === id) {
      return item
    }
  }
  return null
}

function updateObjectImages(
  items: ProjectItem[],
  spriteName: string,
  image: string | undefined
): ProjectItem[] {
  return items.map((item) => {
    if (item.kind === 'group') {
      return { ...item, items: updateObjectImages(item.items, spriteName, image) }
    }
    if (item.type === 'object' && item.object?.sprite === spriteName) {
      return { ...item, image }
    }
    return item
  })
}

export const useApp = create<AppState>((set, get) => ({
  project: null,
  projectDirty: false,
  config: '',
  logs: [{ text: 'OpenGMS is ready.', kind: 'info' }],
  buildState: { phase: 'idle', mode: null },
  loading: false,
  error: null,
  imageVersion: 0,
  startProject: async () => {
    if (get().project || get().loading) return
    set({ loading: true, error: null })

    try {
      const project = await window.openGms.startProject()
      if (!project) {
        set({ loading: false })
        return
      }

      const missing = project.missing > 0 ? `, ${project.missing} missing` : ''
      set((state) => ({
        project,
        projectDirty: false,
        config: project.configs[0] ?? '',
        loading: false,
        error: null,
        imageVersion: 0,
        logs: [...state.logs, {
          text: `Loaded ${project.name}: ${project.total} resources${missing}.`,
          kind: 'info'
        }]
      }))
      window.openGms.setTitle(`${project.name} - OpenGMS`)
    } catch (error) {
      const message = errorText(error)
      set((state) => ({
        loading: false,
        error: message,
        logs: [...state.logs, { text: `Failed to load startup project: ${message}`, kind: 'error' }]
      }))
    }
  },
  newProject: async () => {
    if (get().loading) return null
    set({ loading: true, error: null })

    try {
      const project = await window.openGms.newProject()
      if (!project) {
        set({ loading: false })
        return null
      }

      set((state) => ({
        project,
        projectDirty: false,
        config: project.configs[0] ?? '',
        loading: false,
        error: null,
        imageVersion: 0,
        logs: [...state.logs, { text: `Created project ${project.name}.`, kind: 'info' }]
      }))
      window.openGms.setTitle(`${project.name} - OpenGMS`)
      return project
    } catch (error) {
      const message = errorText(error)
      set((state) => ({
        loading: false,
        error: message,
        logs: [...state.logs, { text: `Failed to create project: ${message}`, kind: 'error' }]
      }))
      return null
    }
  },
  openProject: async () => {
    if (get().loading) return
    set({ loading: true, error: null })

    try {
      const project = await window.openGms.openProject()
      if (!project) {
        set({ loading: false })
        return
      }

      const missing = project.missing > 0 ? `, ${project.missing} missing` : ''
      set((state) => ({
        project,
        projectDirty: false,
        config: project.configs[0] ?? '',
        loading: false,
        error: null,
        imageVersion: 0,
        logs: [...state.logs, {
          text: `Loaded ${project.name}: ${project.total} resources${missing}.`,
          kind: 'info'
        }]
      }))
      window.openGms.setTitle(`${project.name} - OpenGMS`)
    } catch (error) {
      const message = errorText(error)
      set((state) => ({
        loading: false,
        error: message,
        logs: [...state.logs, { text: `Failed to load project: ${message}`, kind: 'error' }]
      }))
    }
  },
  openProjectFile: async (file) => {
    if (get().loading) return false
    set({ loading: true, error: null })

    try {
      const project = await window.openGms.openProjectFile(file)
      const missing = project.missing > 0 ? `, ${project.missing} missing` : ''
      set((state) => ({
        project,
        projectDirty: false,
        config: project.configs[0] ?? '',
        loading: false,
        error: null,
        imageVersion: 0,
        logs: [...state.logs, {
          text: `Loaded ${project.name}: ${project.total} resources${missing}.`,
          kind: 'info'
        }]
      }))
      window.openGms.setTitle(`${project.name} - OpenGMS`)
      return true
    } catch (error) {
      const message = errorText(error)
      set((state) => ({
        loading: false,
        error: message,
        logs: [...state.logs, { text: `Failed to load project: ${message}`, kind: 'error' }]
      }))
      return false
    }
  },
  setProject: (project, changed = true) => set((state) => {
    const untitled = project.untitled ?? state.project?.untitled ?? false
    const next = { ...project, untitled }
    return {
      project: next,
      projectDirty: untitled ? state.projectDirty || changed : false,
      config: next.configs.includes(state.config) ? state.config : (next.configs[0] ?? '')
    }
  }),
  markProjectDirty: () => set((state) => ({
    projectDirty: state.project?.untitled ? true : state.projectDirty
  })),
  setConfig: (config) => set((state) => ({
    config: state.project?.configs.includes(config) ? config : state.config
  })),
  updateSprite: (id, sprite) =>
    set((state) => {
      if (!state.project) return { project: null }
      const spriteItem = state.project.groups
        .filter((group) => group.type === 'sprite')
        .map((group) => findResource(group.items, id))
        .find((item) => item !== null)
      const first = sprite.frames[0]
      const image = first && !first.missing ? first.image : undefined

      return {
        project: {
          ...state.project,
          groups: state.project.groups.map((group) => {
            let items = updateItems(group.items, id, { sprite, image })
            if (spriteItem && group.type === 'object') {
              items = updateObjectImages(items, spriteItem.name, image)
            }
            return { ...group, items }
          })
        }
      }
    }),
  updateSound: (id, sound) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { sound })
            }))
          }
        : null
    })),
  updateBackground: (id, background) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, {
                background,
                image: background.missing ? undefined : background.image
              })
            }))
          }
        : null
    })),
  updateFont: (id, font) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { font })
            }))
          }
        : null
    })),
  updateObject: (id, object) =>
    set((state) => {
      if (!state.project) return { project: null }
      let image: string | undefined

      function findSprite(items: ProjectItem[]): void {
        for (const item of items) {
          if (item.kind === 'group') findSprite(item.items)
          else if (item.type === 'sprite' && item.name === object.sprite) image = item.image
        }
      }

      for (const group of state.project.groups) {
        if (group.type === 'sprite') findSprite(group.items)
      }
      return {
        project: {
          ...state.project,
          groups: state.project.groups.map((group) => ({
            ...group,
            items: updateItems(group.items, id, { object, image })
          }))
        }
      }
    }),
  updateTimeline: (id, timeline) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { timeline })
            }))
          }
        : null
    })),
  updatePath: (id, pathData) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { pathData })
            }))
          }
        : null
    })),
  updateRoom: (id, room) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { room })
            }))
          }
        : null
    })),
  updateScript: (id, script) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { script })
            }))
          }
        : null
    })),
  updateExtension: (id, extension) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { extension })
            }))
          }
        : null
    })),
  updateMacro: (id, macro) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { macro })
            }))
          }
        : null
    })),
  updateShader: (id, shader) =>
    set((state) => ({
      project: state.project
        ? {
            ...state.project,
            groups: state.project.groups.map((group) => ({
              ...group,
              items: updateItems(group.items, id, { shader, shaderType: shader.type })
            }))
          }
        : null
    })),
  refreshImages: () => set((state) => ({ imageVersion: state.imageVersion + 1 })),
  setBuildState: (buildState) => set({ buildState }),
  addLog: (message, kind = 'info') =>
    set((state) => ({ logs: [...state.logs, { text: message, kind }].slice(-5000) })),
  clearLogs: () => set({ logs: [] })
}))
