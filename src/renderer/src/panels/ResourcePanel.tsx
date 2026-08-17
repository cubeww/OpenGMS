import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  Box,
  Boxes,
  Braces,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileArchive,
  FileCheck2,
  FileCode2,
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Image as ImageIcon,
  Info,
  Layers3,
  ListChecks,
  Map,
  Pencil,
  Plus,
  Puzzle,
  Route,
  Search,
  Sparkles,
  Trash2,
  Type,
  Variable,
  Volume2,
  X,
  type LucideIcon
} from 'lucide-react'
import type {
  Project,
  ProjectGroup,
  ProjectItem,
  ResourceDropPosition,
  ResourceTreeRef,
  ResourceType
} from '../../../shared/types'
import { ensureFontsBaked } from '../fontBakeQueue'
import { assetUrl } from '../assets'
import { notifyResourceChange, renameResource } from '../resources'
import { saveAll } from '../save'
import { useApp } from '../store'

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

type Selection = {
  id: string
  ref?: ResourceTreeRef
  item?: ProjectItem
  name: string
}

type ContextMenu = Selection & {
  x: number
  y: number
  ref: ResourceTreeRef
}

type DropMark = {
  key: string
  position: ResourceDropPosition
}

type TreeActions = {
  expanded: Set<string>
  toggle: (id: string) => void
  forceOpen: boolean
  projectPath: string
  imageVersion: number
  selection: Selection | null
  select: (selection: Selection) => void
  showMenu: (
    event: React.MouseEvent,
    ref: ResourceTreeRef,
    name: string,
    item?: ProjectItem
  ) => void
  open: (item: ResourceItem, ref: ResourceTreeRef) => void
  canDrag: boolean
  dragStart: (event: React.DragEvent, ref: ResourceTreeRef) => void
  dragOver: (event: React.DragEvent, ref: ResourceTreeRef) => void
  drop: (event: React.DragEvent, ref: ResourceTreeRef) => void
  dragEnd: () => void
  dropMark: DropMark | null
}

const groupInfo: Array<{ type: ResourceType; name: string; one: string }> = [
  { type: 'sprite', name: 'Sprites', one: 'Sprite' },
  { type: 'sound', name: 'Sounds', one: 'Sound' },
  { type: 'background', name: 'Backgrounds', one: 'Background' },
  { type: 'path', name: 'Paths', one: 'Path' },
  { type: 'script', name: 'Scripts', one: 'Script' },
  { type: 'shader', name: 'Shaders', one: 'Shader' },
  { type: 'font', name: 'Fonts', one: 'Font' },
  { type: 'timeline', name: 'Time Lines', one: 'Time Line' },
  { type: 'object', name: 'Objects', one: 'Object' },
  { type: 'room', name: 'Rooms', one: 'Room' },
  { type: 'file', name: 'Included Files', one: 'File' },
  { type: 'extension', name: 'Extensions', one: 'Extension' },
  { type: 'macro', name: 'Macros', one: 'Macro' }
]

const icons: Record<ResourceType, LucideIcon> = {
  sprite: ImageIcon,
  sound: Volume2,
  background: Layers3,
  path: Route,
  script: Braces,
  shader: Sparkles,
  font: Type,
  timeline: Clock3,
  object: Box,
  room: Map,
  file: FileArchive,
  extension: Puzzle,
  macro: Variable
}

const emptyGroups: ProjectGroup[] = groupInfo.map((group) => ({
  type: group.type,
  name: group.name,
  count: 0,
  items: []
}))

function resourceName(type: ResourceType): string {
  return groupInfo.find((group) => group.type === type)?.one ?? 'Resource'
}

function matches(name: string, query: string): boolean {
  const value = name.toLocaleLowerCase()
  const search = query.toLocaleLowerCase()
  return value.includes(search)
}

function filterItems(items: ProjectItem[], query: string): ProjectItem[] {
  return items.flatMap<ProjectItem>((item) => {
    if (item.kind === 'resource') {
      const nestedMatch = item.type === 'extension' && item.extension?.files.some((file) =>
        matches(file.filename, query) ||
        file.functions.some((fn) => matches(fn.name, query))
      )
      return matches(item.name, query) || nestedMatch ? [item] : []
    }

    if (matches(item.name, query)) return [item]
    const found = filterItems(item.items, query)
    return found.length > 0 ? [{ ...item, items: found }] : []
  })
}

function countItems(items: ProjectItem[]): number {
  return items.reduce(
    (total, item) => total + (item.kind === 'group' ? countItems(item.items) : 1),
    0
  )
}

function refKey(ref: ResourceTreeRef): string {
  return JSON.stringify([ref.type, ref.kind, ref.groupPath, ref.path ?? ''])
}

function sameRef(left: ResourceTreeRef, right: ResourceTreeRef): boolean {
  return refKey(left) === refKey(right)
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'The resource operation failed.'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function ExtensionFileRow({
  item,
  fileIndex,
  level,
  actions
}: {
  item: ResourceItem
  fileIndex: number
  level: number
  actions: TreeActions
}): React.JSX.Element | null {
  const file = item.extension?.files[fileIndex]
  if (!file) return null
  const id = `extension-file:${item.id}:${fileIndex}`
  const open = actions.forceOpen || actions.expanded.has(id)

  return (
    <>
      <button
        className={`tree-row tree-resource extension-file-row ${actions.selection?.id === id ? 'selected' : ''}`}
        role="treeitem"
        aria-expanded={open}
        aria-selected={actions.selection?.id === id}
        title={file.originalName || file.filename}
        style={{ paddingLeft: `${4 + level * 15}px` }}
        onClick={() => {
          actions.select({ id, name: file.filename })
          actions.toggle(id)
        }}
        onDoubleClick={() => window.dispatchEvent(new CustomEvent(
          'opengms:open-extension-file',
          { detail: { item, fileIndex } }
        ))}
      >
        <ChevronRight className={`tree-arrow ${open ? 'open' : ''}`} size={14} />
        <FileCode2 className="resource-icon extension-file" size={16} />
        <span className="tree-name">{file.filename || `File ${fileIndex + 1}`}</span>
        <span className="tree-count">{file.functions.length}</span>
      </button>
      {open && file.functions.map((fn, functionIndex) => {
        const functionId = `extension-function:${item.id}:${fileIndex}:${functionIndex}`
        return (
          <button
            className={`tree-row tree-resource extension-function-row ${actions.selection?.id === functionId ? 'selected' : ''}`}
            role="treeitem"
            aria-selected={actions.selection?.id === functionId}
            title={fn.externalName || fn.name}
            style={{ paddingLeft: `${4 + (level + 1) * 15}px` }}
            key={functionId}
            onClick={() => actions.select({ id: functionId, name: fn.name })}
            onDoubleClick={() => window.dispatchEvent(new CustomEvent(
              'opengms:open-extension-function',
              { detail: { item, fileIndex, functionIndex } }
            ))}
          >
            <span className="tree-spacer" />
            <Boxes className="resource-icon extension-function" size={16} />
            <span className="tree-name">{fn.name || `Function ${functionIndex + 1}`}</span>
          </button>
        )
      })}
    </>
  )
}

function Thumbnail({
  item,
  projectPath,
  version
}: {
  item: ResourceItem
  projectPath: string
  version: number
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const Icon = item.type === 'object' ? Box : item.type === 'background' ? Layers3 : ImageIcon

  useEffect(() => setFailed(false), [item.image, projectPath, version])

  if (!item.image || failed) {
    return (
      <span className={`resource-thumb thumb-fallback ${item.type}`} aria-hidden="true">
        <Icon size={14} />
      </span>
    )
  }

  return (
    <img
      className="resource-thumb"
      src={assetUrl(item.image, projectPath, version)}
      alt=""
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

function ItemRow({
  item,
  level,
  groupPath,
  actions
}: {
  item: ProjectItem
  level: number
  groupPath: string[]
  actions: TreeActions
}): React.JSX.Element {
  const isGroup = item.kind === 'group'
  const isExtension = item.kind === 'resource' && item.type === 'extension'
  const isMacro = item.kind === 'resource' && item.type === 'macro'
  const expandable = isGroup || isExtension
  const hasThumb = item.kind === 'resource' && (
    item.type === 'sprite' || item.type === 'object' || item.type === 'background'
  )
  const ref: ResourceTreeRef = isGroup
    ? { type: item.type, kind: 'group', groupPath: [...groupPath, item.name] }
    : { type: item.type, kind: 'resource', groupPath, path: item.path }
  const open = expandable && (actions.forceOpen || actions.expanded.has(item.id))
  const Icon = isGroup ? FolderClosed : icons[item.type]
  const itemCount = isGroup ? countItems(item.items) : null
  const mark = actions.dropMark?.key === refKey(ref) ? actions.dropMark.position : null

  return (
    <>
      <button
        data-resource-id={item.kind === 'resource' ? item.id : undefined}
        className={`tree-row ${isGroup ? 'tree-group' : 'tree-resource'} ${hasThumb ? 'has-thumb' : ''} ${actions.selection?.id === item.id ? 'selected' : ''} ${item.kind === 'resource' && item.missing ? 'tree-missing' : ''} ${mark ? `drop-${mark}` : ''}`}
        role="treeitem"
        aria-expanded={expandable ? open : undefined}
        aria-selected={actions.selection?.id === item.id}
        title={item.kind === 'resource' ? `${item.path}${item.missing ? ' (missing)' : ''}` : item.name}
        style={{ paddingLeft: `${4 + level * 15}px` }}
        draggable={actions.canDrag && !isMacro}
        onClick={() => {
          actions.select({ id: item.id, ref, item, name: item.name })
          if (expandable) actions.toggle(item.id)
        }}
        onContextMenu={(event) => actions.showMenu(event, ref, item.name, item)}
        onDoubleClick={() => {
          if (item.kind === 'resource') actions.open(item, ref)
        }}
        onDragStart={(event) => actions.dragStart(event, ref)}
        onDragOver={(event) => actions.dragOver(event, ref)}
        onDrop={(event) => actions.drop(event, ref)}
        onDragEnd={actions.dragEnd}
      >
        {expandable ? (
          <ChevronRight className={`tree-arrow ${open ? 'open' : ''}`} size={14} />
        ) : (
          <span className="tree-spacer" />
        )}
        {hasThumb ? (
          <Thumbnail item={item} projectPath={actions.projectPath} version={actions.imageVersion} />
        ) : isMacro ? (
          <span className="macro-tree-icon" aria-hidden="true">C</span>
        ) : (
          <Icon className={isGroup ? 'folder-icon' : `resource-icon ${item.type}`} size={16} />
        )}
        <span className="tree-name">{item.name}</span>
        {itemCount !== null && <span className="tree-count">{itemCount}</span>}
        {item.kind === 'resource' && item.missing && <span className="missing-mark">!</span>}
      </button>
      {isGroup && open && item.items.map((child) => (
        <ItemRow
          key={child.id}
          item={child}
          level={level + 1}
          groupPath={ref.groupPath}
          actions={actions}
        />
      ))}
      {isExtension && open && item.extension?.files.map((_file, fileIndex) => (
        <ExtensionFileRow
          key={`extension-file:${item.id}:${fileIndex}`}
          item={item}
          fileIndex={fileIndex}
          level={level + 1}
          actions={actions}
        />
      ))}
    </>
  )
}

function MenuItem({
  icon: Icon,
  label,
  shortcut,
  disabled,
  onClick
}: {
  icon?: LucideIcon
  label: string
  shortcut?: string
  disabled?: boolean
  onClick?: () => void
}): React.JSX.Element {
  return (
    <button type="button" disabled={disabled} onClick={onClick}>
      <span className="resource-menu-icon">{Icon && <Icon size={15} />}</span>
      <span>{label}</span>
      <kbd>{shortcut}</kbd>
    </button>
  )
}

export function ResourcePanel(): React.JSX.Element {
  const project = useApp((state) => state.project)
  const imageVersion = useApp((state) => state.imageVersion)
  const setProject = useApp((state) => state.setProject)
  const addLog = useApp((state) => state.addLog)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selection, setSelection] = useState<Selection | null>(null)
  const [menu, setMenu] = useState<ContextMenu | null>(null)
  const [rename, setRename] = useState<Selection | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [dragRef, setDragRef] = useState<ResourceTreeRef | null>(null)
  const [dropMark, setDropMark] = useState<DropMark | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const groups = project?.groups ?? emptyGroups
  const search = query.trim()
  const filtering = search.length > 0

  useEffect(() => {
    setExpanded(new Set())
    setSelection(null)
    setMenu(null)
    setRename(null)
    setQuery('')
  }, [project?.path])

  useEffect(() => {
    if (selection?.item?.kind !== 'resource') return
    window.dispatchEvent(new CustomEvent('opengms:resource-selected', {
      detail: selection.item
    }))
  }, [selection])

  useEffect(() => {
    function selectResource(event: Event): void {
      const item = (event as CustomEvent<ResourceItem>).detail
      if (!item || item.kind !== 'resource') return
      const ref: ResourceTreeRef = {
        type: item.type,
        kind: 'resource',
        groupPath: [],
        path: item.path
      }
      setQuery('')
      setMenu(null)
      setRename(null)
      setExpanded((current) => new Set(current).add(`root:${item.type}`))
      setSelection({ id: item.id, ref, item, name: item.name })
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
        const row = Array.from(document.querySelectorAll<HTMLElement>('[data-resource-id]'))
          .find((element) => element.dataset.resourceId === item.id)
        row?.scrollIntoView({ block: 'nearest' })
      }))
    }

    window.addEventListener('opengms:select-resource', selectResource)
    return () => window.removeEventListener('opengms:select-resource', selectResource)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 4500)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    if (!menu) return
    const close = (event: PointerEvent): void => {
      const target = event.target
      if (!(target instanceof Element) || !target.closest('.resource-context-menu')) setMenu(null)
    }
    const escape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setMenu(null)
    }
    const blur = (): void => setMenu(null)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', escape)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', escape)
      window.removeEventListener('blur', blur)
    }
  }, [menu])

  const visibleGroups = useMemo(() => {
    if (!filtering) return groups
    return groups.flatMap((group) => {
      if (matches(group.name, search)) return [group]
      const items = filterItems(group.items, search)
      return items.length > 0 ? [{ ...group, count: countItems(items), items }] : []
    })
  }, [filtering, groups, search])

  const showGameInfo = !filtering || matches('Game Information', search)
  const showGlobalSettings = !filtering || matches('Global Game Settings', search)

  function toggle(id: string): void {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function select(next: Selection): void {
    setSelection(next)
  }

  function showMenu(
    event: React.MouseEvent,
    ref: ResourceTreeRef,
    name: string,
    item?: ProjectItem
  ): void {
    event.preventDefault()
    event.stopPropagation()
    const next = { id: item?.id ?? `root:${ref.type}`, ref, item, name }
    setSelection(next)
    setMenu({ ...next, x: event.clientX, y: event.clientY, ref })
  }

  function openResource(item: ResourceItem, ref: ResourceTreeRef): void {
    setMenu(null)
    const events: Partial<Record<ResourceType, string>> = {
      sprite: 'opengms:open-sprite',
      sound: 'opengms:open-sound',
      background: 'opengms:open-background',
      path: 'opengms:open-path',
      font: 'opengms:open-font',
      script: 'opengms:open-script',
      shader: 'opengms:open-shader',
      object: 'opengms:open-object',
      timeline: 'opengms:open-timeline',
      room: 'opengms:open-room',
      extension: 'opengms:open-extension',
      macro: 'opengms:open-macro'
    }
    const event = events[item.type]
    if (event) window.dispatchEvent(new CustomEvent(event, { detail: item }))
    else void openExternal(ref)
  }

  async function runProjectAction(
    label: string,
    action: () => Promise<Project | null>,
    after?: (project: Project) => void | Promise<void>
  ): Promise<void> {
    if (!project || busy) return
    setMenu(null)
    setBusy(true)
    setNotice('')
    try {
      const next = await action()
      if (!next) return
      setProject(next)
      notifyResourceChange({
        previous: project,
        project: next
      })
      await after?.(next)
      setSelection(null)
      setExpanded((current) => new Set(current).add(`root:${menu?.ref.type ?? selection?.ref?.type ?? ''}`))
      addLog(`${label}.`)
    } catch (error) {
      const message = errorText(error)
      setNotice(message)
      addLog(`${label} failed: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  function childGroup(ref: ResourceTreeRef): string[] {
    return ref.kind === 'group' ? ref.groupPath : ref.kind === 'resource' ? ref.groupPath : []
  }

  function createAt(ref: ResourceTreeRef): void {
    void runProjectAction(
      `Created ${resourceName(ref.type)}`,
      () => window.openGms.createResource(ref.type, childGroup(ref)),
      ref.type === 'font' ? async (project) => { await ensureFontsBaked(project) } : undefined
    )
  }

  function addExistingAt(ref: ResourceTreeRef): void {
    void runProjectAction(`Added existing ${resourceName(ref.type)}`, () =>
      window.openGms.addExistingResource(ref.type, childGroup(ref)))
  }

  function duplicateTarget(target: Selection): void {
    if (target.ref?.kind !== 'resource') return
    void runProjectAction(`Duplicated ${target.name}`, () =>
      window.openGms.duplicateResource(target.ref!))
  }

  function createGroupAt(ref: ResourceTreeRef): void {
    void runProjectAction('Created resource group', () =>
      window.openGms.createResourceGroup(ref.type, childGroup(ref)))
  }

  function sortAt(ref: ResourceTreeRef): void {
    const path = ref.kind === 'group' ? ref.groupPath : []
    void runProjectAction('Sorted resources by name', () =>
      window.openGms.sortResourceGroup(ref.type, path))
  }

  function askDelete(target: Selection): void {
    if (!target.ref || target.ref.kind === 'root') return
    const kind = target.ref.kind === 'group' ? 'group and all of its contents' : 'resource'
    if (!window.confirm(`Delete the ${kind} “${target.name}”?\n\nIts files will be moved to the system Trash.`)) return
    void runProjectAction(`Deleted ${target.name}`, () => window.openGms.deleteResourceItem(target.ref!))
  }

  function startRename(target: Selection): void {
    if (!target.ref || target.ref.kind === 'root') return
    setMenu(null)
    setRenameValue(target.name)
    setRename(target)
  }

  function commitRename(): void {
    if (!rename?.ref || !renameValue.trim()) return
    const target = rename
    const oldName = rename.name
    const ref = rename.ref
    const name = renameValue.trim()
    setRename(null)

    if (target.item?.kind === 'resource') {
      setMenu(null)
      setBusy(true)
      setNotice('')
      void renameResource(target.item, name)
        .then(() => {
          setSelection(null)
          setExpanded((current) => new Set(current).add(`root:${ref.type}`))
          addLog(`Renamed ${oldName} to ${name}.`)
        })
        .catch((error) => {
          const message = errorText(error)
          setNotice(message)
          addLog(`Renamed ${oldName} to ${name} failed: ${message}`)
        })
        .finally(() => setBusy(false))
      return
    }

    void runProjectAction(
      `Renamed ${oldName} to ${name}`,
      async () => {
        if (!(await saveAll())) throw new Error('Open editor changes could not be saved.')
        return window.openGms.renameResourceItem(ref, name)
      }
    )
  }

  async function reveal(ref: ResourceTreeRef): Promise<void> {
    setMenu(null)
    try {
      await window.openGms.revealResourceItem(ref)
    } catch (error) {
      const message = errorText(error)
      setNotice(message)
      addLog(`Open in Explorer failed: ${message}`)
    }
  }

  async function openExternal(ref: ResourceTreeRef): Promise<void> {
    setMenu(null)
    try {
      const message = await window.openGms.openExternalResource(ref)
      if (message) throw new Error(message)
    } catch (error) {
      const message = errorText(error)
      setNotice(message)
      addLog(`Open in external editor failed: ${message}`)
    }
  }

  async function findReferences(target: Selection): Promise<void> {
    if (!target.ref || target.ref.kind !== 'resource' || busy) return
    setMenu(null)
    setBusy(true)
    try {
      const references = await window.openGms.checkResourceReferences(target.ref)
      addLog(`${target.name}: ${references.length} reference${references.length === 1 ? '' : 's'} found.`)
      for (const reference of references) {
        addLog(`${reference.file}:${reference.line}  ${reference.text}`)
      }
      setNotice(`${references.length} reference${references.length === 1 ? '' : 's'} found. See Output for details.`)
    } catch (error) {
      const message = errorText(error)
      setNotice(message)
      addLog(`Check references failed: ${message}`)
    } finally {
      setBusy(false)
    }
  }

  function canDrop(source: ResourceTreeRef, target: ResourceTreeRef, position: ResourceDropPosition): boolean {
    if (source.kind === 'root' || source.type !== target.type || source.type === 'macro') return false
    if (sameRef(source, target)) return false
    if (target.kind === 'resource' && position === 'inside') return false
    if (source.type === 'extension' && (source.kind !== 'resource' || target.kind === 'group')) return false
    if (source.kind === 'group') {
      const destination = position === 'inside'
        ? target.kind === 'root' ? [] : target.groupPath
        : target.kind === 'root' ? [] : target.groupPath.slice(0, -1)
      if (
        destination.length >= source.groupPath.length &&
        source.groupPath.every((name, index) => destination[index] === name)
      ) return false
    }
    return true
  }

  function dragStart(event: React.DragEvent, ref: ResourceTreeRef): void {
    if (filtering || ref.type === 'macro' || ref.kind === 'root') {
      event.preventDefault()
      return
    }
    setDragRef(ref)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-opengms-resource', JSON.stringify(ref))
  }

  function dropPosition(event: React.DragEvent, target: ResourceTreeRef): ResourceDropPosition {
    if (target.kind === 'root') return 'inside'
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientY - rect.top) / Math.max(1, rect.height)
    if (target.kind === 'group') return ratio < 0.25 ? 'before' : ratio > 0.75 ? 'after' : 'inside'
    return ratio < 0.5 ? 'before' : 'after'
  }

  function dragOver(event: React.DragEvent, target: ResourceTreeRef): void {
    const position = dropPosition(event, target)
    if (!dragRef || !canDrop(dragRef, target, position)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDropMark({ key: refKey(target), position })
  }

  function drop(event: React.DragEvent, target: ResourceTreeRef): void {
    event.preventDefault()
    event.stopPropagation()
    const position = dropPosition(event, target)
    let source = dragRef
    if (!source) {
      try {
        source = JSON.parse(event.dataTransfer.getData('application/x-opengms-resource')) as ResourceTreeRef
      } catch {
        source = null
      }
    }
    setDropMark(null)
    setDragRef(null)
    if (!source || !canDrop(source, target, position)) return
    if (position === 'inside') {
      const id = target.kind === 'root'
        ? `root:${target.type}`
        : `${target.type}:group:${target.groupPath.join('/')}`
      setExpanded((current) => new Set(current).add(id))
    }
    void runProjectAction('Moved resource', () => window.openGms.moveResourceItem(source!, target, position))
  }

  function dragEnd(): void {
    setDragRef(null)
    setDropMark(null)
  }

  useEffect(() => {
    const shortcuts = (event: KeyboardEvent): void => {
      if (!selection?.ref || busy || !project) return
      const target = event.target
      const active = document.activeElement
      if (!(active instanceof Element) || !active.closest('.resource-panel')) return
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) return
      const editable = selection.ref.type !== 'macro' && selection.ref.kind !== 'root'
      if (event.key === 'F2' && editable) {
        event.preventDefault()
        startRename(selection)
      } else if (event.key === 'Delete' && event.shiftKey && editable) {
        event.preventDefault()
        askDelete(selection)
      } else if (event.key === 'Insert' && event.altKey && selection.ref.kind === 'resource' && selection.ref.type !== 'macro') {
        event.preventDefault()
        duplicateTarget(selection)
      } else if (event.key === 'Insert' && event.shiftKey && !['macro', 'extension'].includes(selection.ref.type)) {
        event.preventDefault()
        createGroupAt(selection.ref)
      } else if (event.key === 'Enter' && event.altKey && selection.item?.kind === 'resource') {
        event.preventDefault()
        openResource(selection.item, selection.ref)
      }
    }
    window.addEventListener('keydown', shortcuts)
    return () => window.removeEventListener('keydown', shortcuts)
  })

  const actions: TreeActions = {
    expanded,
    toggle,
    forceOpen: filtering,
    projectPath: project?.path ?? '',
    imageVersion,
    selection,
    select,
    showMenu,
    open: openResource,
    canDrag: Boolean(project) && !filtering && !busy,
    dragStart,
    dragOver,
    drop,
    dragEnd,
    dropMark
  }

  const mutableMenu = Boolean(project) && menu?.ref.type !== 'macro'
  const canGroup = mutableMenu && menu?.ref.type !== 'extension'
  const menuResource = menu?.ref.kind === 'resource'
  const menuGroup = menu?.ref.kind === 'group'
  const menuPrefix = menuResource ? 'Insert' : 'Create'

  return (
    <section className="resource-panel">
      <div className="resource-search">
        <label className="resource-search-box">
          <Search size={14} />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter resources"
            aria-label="Filter resource tree"
          />
        </label>
        {notice && <div className="resource-notice" title={notice}>{notice}</div>}
      </div>

      <div className="resource-list" role="tree" aria-label="Project resources">
        {visibleGroups.length === 0 && !showGameInfo && !showGlobalSettings && (
          <div className="tree-message">No matches</div>
        )}
        {visibleGroups.map((group) => {
          const id = `root:${group.type}`
          const open = filtering || expanded.has(id)
          const Icon = icons[group.type]
          const ref: ResourceTreeRef = { type: group.type, kind: 'root', groupPath: [] }
          const mark = dropMark?.key === refKey(ref) ? dropMark.position : null
          return (
            <div key={group.type}>
              <button
                className={`tree-row tree-root ${selection?.id === id ? 'selected' : ''} ${mark ? `drop-${mark}` : ''}`}
                role="treeitem"
                aria-expanded={open}
                aria-selected={selection?.id === id}
                onClick={() => {
                  select({ id, ref, name: group.name })
                  toggle(id)
                }}
                onContextMenu={(event) => showMenu(event, ref, group.name)}
                onDragOver={(event) => dragOver(event, ref)}
                onDrop={(event) => drop(event, ref)}
              >
                <ChevronRight className={`tree-arrow ${open ? 'open' : ''}`} size={14} />
                <Icon className={`root-icon ${group.type}`} size={16} />
                <span className="tree-name">{group.name}</span>
                <span className="tree-count">{group.count}</span>
              </button>
              {open && group.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  level={1}
                  groupPath={[]}
                  actions={actions}
                />
              ))}
            </div>
          )
        })}
        {(showGameInfo || showGlobalSettings) && <div className="tree-rule" />}
        {showGameInfo && (
          <button
            className={`tree-row ${selection?.id === 'game-information' ? 'selected' : ''}`}
            role="treeitem"
            aria-selected={selection?.id === 'game-information'}
            disabled={!project}
            onClick={() => setSelection({ id: 'game-information', name: 'Game Information' })}
            onDoubleClick={() => window.dispatchEvent(new Event('opengms:open-game-info'))}
          >
            <span className="tree-spacer" />
            <Info className="info-icon" size={16} />
            <span className="tree-name">Game Information</span>
          </button>
        )}
        {showGlobalSettings && (
          <button
            className={`tree-row ${selection?.id === 'global-game-settings' ? 'selected' : ''}`}
            role="treeitem"
            aria-selected={selection?.id === 'global-game-settings'}
            disabled={!project}
            onClick={() => setSelection({ id: 'global-game-settings', name: 'Global Game Settings' })}
            onDoubleClick={() => window.dispatchEvent(new Event('opengms:open-global-settings'))}
          >
            <span className="tree-spacer" />
            <FileCheck2 className="settings-icon" size={16} />
            <span className="tree-name">Global Game Settings</span>
          </button>
        )}
      </div>

      {menu && createPortal(
        <div
          className="resource-context-menu"
          style={{
            left: Math.max(4, Math.min(menu.x, window.innerWidth - 246)),
            top: Math.max(4, Math.min(menu.y, window.innerHeight - (menuResource ? 400 : 330)))
          }}
          role="menu"
          onContextMenu={(event) => event.preventDefault()}
        >
          <MenuItem
            icon={Plus}
            label={`${menuPrefix} ${resourceName(menu.ref.type)}`}
            disabled={!mutableMenu || busy}
            onClick={() => createAt(menu.ref)}
          />
          <MenuItem
            icon={FolderOpen}
            label={`Add Existing ${resourceName(menu.ref.type)}`}
            disabled={!mutableMenu || busy}
            onClick={() => addExistingAt(menu.ref)}
          />
          <MenuItem
            icon={Copy}
            label="Duplicate"
            shortcut="Alt+Ins"
            disabled={!mutableMenu || !menuResource || busy}
            onClick={() => duplicateTarget(menu)}
          />
          <div className="resource-menu-rule" />
          <MenuItem
            icon={FolderPlus}
            label={`${menuResource ? 'Insert' : 'Create'} Group`}
            shortcut="Shift+Ins"
            disabled={!canGroup || busy}
            onClick={() => createGroupAt(menu.ref)}
          />
          <MenuItem
            label="Sort by Name"
            disabled={!mutableMenu || (!menuGroup && menu.ref.kind !== 'root') || busy}
            onClick={() => sortAt(menu.ref)}
          />
          <div className="resource-menu-rule" />
          <MenuItem
            icon={Trash2}
            label="Delete"
            shortcut="Shift+Del"
            disabled={!mutableMenu || (!menuResource && !menuGroup) || busy}
            onClick={() => askDelete(menu)}
          />
          <MenuItem
            icon={Pencil}
            label="Rename"
            shortcut="F2"
            disabled={!mutableMenu || (!menuResource && !menuGroup) || busy}
            onClick={() => startRename(menu)}
          />
          {menuResource && (
            <MenuItem
              icon={ListChecks}
              label="Check References"
              disabled={!mutableMenu || busy}
              onClick={() => void findReferences(menu)}
            />
          )}
          <MenuItem
            icon={FileCheck2}
            label="Properties..."
            shortcut="Alt+Enter"
            disabled={!menuResource || !menu.item || busy}
            onClick={() => menu.item?.kind === 'resource' && openResource(menu.item, menu.ref)}
          />
          <MenuItem
            icon={FolderOpen}
            label="Open in Explorer"
            disabled={!project || menu.ref.type === 'macro'}
            onClick={() => void reveal(menu.ref)}
          />
          {menuResource && (
            <MenuItem
              icon={ExternalLink}
              label="Open in External Editor"
              disabled={!mutableMenu || busy}
              onClick={() => void openExternal(menu.ref)}
            />
          )}
        </div>,
        document.body
      )}

      {rename && createPortal(
        <div
          className="resource-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setRename(null)
          }}
        >
          <form
            className="resource-rename-dialog"
            onSubmit={(event) => {
              event.preventDefault()
              commitRename()
            }}
          >
            <header>
              <strong>Rename {rename.ref?.kind === 'group' ? 'Group' : resourceName(rename.ref?.type ?? 'file')}</strong>
              <button type="button" title="Close" onClick={() => setRename(null)}><X size={16} /></button>
            </header>
            <label>
              Name
              <input
                autoFocus
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <footer>
              <button type="button" onClick={() => setRename(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={!renameValue.trim()}>Rename</button>
            </footer>
          </form>
        </div>,
        document.body
      )}
    </section>
  )
}
