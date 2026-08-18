import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Atom,
  Box,
  Braces,
  Check,
  Eye,
  Grid3X3,
  Image as ImageIcon,
  Info,
  Layers3,
  Map,
  Plus,
  Settings2,
  SquarePen,
  Trash2,
  X,
  type LucideIcon
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  Project,
  ProjectItem,
  ResourceType,
  RoomBackground,
  RoomData,
  RoomInstance,
  RoomTile,
  RoomView
} from '../../../shared/types'
import { assetUrl } from '../assets'
import { CodeEditor } from '../CodeEditor'
import { requestCodeReveal } from '../codeReveal'
import {
  listenSearchReveal,
  type CodeSearchResult
} from '../codeSearch'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { ResourceSelect } from '../ResourceSelect'
import { useSave } from '../save'
import { useApp } from '../store'
import { RoomCanvas, type RoomPage } from './RoomCanvas'

type RoomItem = Extract<ProjectItem, { kind: 'resource' }>
type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

export type RoomParams = {
  item: RoomItem
  projectPath: string
}

const pages: Array<{ id: RoomPage; name: string; icon: LucideIcon }> = [
  { id: 'backgrounds', name: 'Backgrounds', icon: ImageIcon },
  { id: 'views', name: 'Views', icon: Eye },
  { id: 'physics', name: 'Physics', icon: Atom },
  { id: 'objects', name: 'Objects', icon: Box },
  { id: 'settings', name: 'Settings', icon: Settings2 },
  { id: 'tiles', name: 'Tiles', icon: Grid3X3 }
]

function copyRoom(room: RoomData): RoomData {
  return {
    ...room,
    backgrounds: room.backgrounds.map((item) => ({ ...item })),
    views: room.views.map((item) => ({ ...item })),
    instances: room.instances.map((item) => ({ ...item, extra: { ...item.extra } })),
    tiles: room.tiles.map((item) => ({ ...item })),
    physics: { ...room.physics }
  }
}

function items(project: Project | null, type: ResourceType): ResourceItem[] {
  const result: ResourceItem[] = []
  function visit(list: ProjectItem[]): void {
    for (const item of list) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }
  if (project) for (const group of project.groups) visit(group.items)
  return result
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function hexColor(value: number): string {
  const color = value >>> 0
  const red = color & 0xff
  const green = (color >>> 8) & 0xff
  const blue = (color >>> 16) & 0xff
  return `#${[red, green, blue].map((item) => item.toString(16).padStart(2, '0')).join('')}`
}

function roomColor(value: string, alpha = 0): number {
  const color = Number.parseInt(value.slice(1), 16)
  if (!Number.isFinite(color)) return alpha << 24
  const red = (color >>> 16) & 0xff
  const green = (color >>> 8) & 0xff
  const blue = color & 0xff
  return ((alpha & 0xff) << 24 | blue << 16 | green << 8 | red) >>> 0
}

function token(prefix: string, used: Set<string>): string {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const data = new Uint32Array(1)
    crypto.getRandomValues(data)
    const value = `${prefix}_${data[0].toString(16).toUpperCase().padStart(8, '0')}`
    if (!used.has(value)) return value
  }
  return `${prefix}_${Date.now().toString(16).toUpperCase()}`
}

function Field({
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange
}: {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="room-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  )
}

function CheckField({
  label,
  checked,
  disabled,
  onChange
}: {
  label: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}): React.JSX.Element {
  return (
    <label className="room-check">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return <section className="room-side-group"><h3>{title}</h3><div>{children}</div></section>
}

function CodeDialog({
  id,
  title,
  subtitle,
  value,
  onChange,
  onClose
}: {
  id: string
  title: string
  subtitle: string
  value: string
  onChange: (value: string) => void
  onClose: () => void
}): React.JSX.Element {
  useEffect(() => {
    function close(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="object-dialog-backdrop action-editor-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="action-editor-dialog code room-code-dialog" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="action-editor-name"><Braces size={18} /><div><strong>{title}</strong><small>{subtitle}</small></div></div>
          <button onClick={onClose} title="Close"><X size={16} /></button>
        </header>
        <CodeEditor
          id={id}
          value={value}
          eol={value.includes('\r\n') ? 'crlf' : 'lf'}
          onChange={onChange}
        />
      </section>
    </div>
  )
}

function OrderDialog({
  instances,
  onChange,
  onClose
}: {
  instances: RoomInstance[]
  onChange: (instances: RoomInstance[]) => void
  onClose: () => void
}): React.JSX.Element {
  const [selected, setSelected] = useState(instances.length ? 0 : -1)

  function move(step: number): void {
    const target = selected + step
    if (selected < 0 || target < 0 || target >= instances.length) return
    const next = [...instances]
    ;[next[selected], next[target]] = [next[target], next[selected]]
    onChange(next)
    setSelected(target)
  }

  return (
    <div className="object-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="room-order-dialog" role="dialog" aria-modal="true" aria-label="Instance Order" onMouseDown={(event) => event.stopPropagation()}>
        <header><strong>Instance Order</strong><button onClick={onClose} title="Close"><X size={16} /></button></header>
        <div className="room-order-list">
          {instances.map((instance, index) => (
            <button key={instance.name} className={index === selected ? 'selected' : ''} onClick={() => setSelected(index)}>
              <span>{index + 1}</span><strong>{instance.object}</strong><small>{instance.name}</small>
            </button>
          ))}
          {!instances.length && <span className="room-list-empty">No instances</span>}
        </div>
        <aside>
          <button onClick={() => move(-1)} disabled={selected <= 0}><ArrowUp size={15} /> Move up</button>
          <button onClick={() => move(1)} disabled={selected < 0 || selected >= instances.length - 1}><ArrowDown size={15} /> Move down</button>
        </aside>
        <footer><button className="primary" onClick={onClose}><Check size={14} /> Done</button></footer>
      </section>
    </div>
  )
}

export function RoomPanel({ params, api }: IDockviewPanelProps<RoomParams>): React.JSX.Element {
  const project = useApp((state) => state.project)
  const imageVersion = useApp((state) => state.imageVersion)
  const updateRoom = useApp((state) => state.updateRoom)
  const addLog = useApp((state) => state.addLog)
  const [room, setRoom] = useState<RoomData | null>(() => params.item.room ? copyRoom(params.item.room) : null)
  const [loading, setLoading] = useState(!params.item.room)
  const [loadError, setLoadError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [page, setPage] = useState<RoomPage>('objects')
  const [showGrid, setShowGrid] = useState(true)
  const [backgroundIndex, setBackgroundIndex] = useState(0)
  const [viewIndex, setViewIndex] = useState(0)
  const [selectedInstance, setSelectedInstance] = useState('')
  const [objectName, setObjectName] = useState('')
  const [tileBackground, setTileBackground] = useState('')
  const [tileSource, setTileSource] = useState({ x: 0, y: 0 })
  const [tileDepth, setTileDepth] = useState(1000000)
  const [deleteObjects, setDeleteObjects] = useState(false)
  const [deleteTiles, setDeleteTiles] = useState(false)
  const [hideOtherLayers, setHideOtherLayers] = useState(false)
  const [place, setPlace] = useState({ scaleX: 1, scaleY: 1, rotation: 0, color: 0xffffffff })
  const [codeOpen, setCodeOpen] = useState(false)
  const [instanceCode, setInstanceCode] = useState('')
  const [orderOpen, setOrderOpen] = useState(false)
  const editVersion = useRef(0)
  const searchTarget = useRef<CodeSearchResult | null>(null)
  useSave(api.id, dirty, save)
  const objectItems = useMemo(() => items(project, 'object'), [project])
  const backgroundItems = useMemo(() => items(project, 'background'), [project])
  const selected = room?.instances.find((item) => item.name === selectedInstance)
  const displayObject = selected?.object || objectName
  const selectedObjectItem = objectItems.find((item) => item.name === displayObject)
  const tileItem = backgroundItems.find((item) => item.name === tileBackground)

  useEffect(() => {
    if (room) return
    let active = true
    setLoading(true)
    void window.openGms.readRoom(params.item.file).then((value) => {
      if (!active) return
      const next = copyRoom(value)
      setRoom(next)
      updateRoom(params.item.id, copyRoom(next))
      setLoading(false)
    }).catch((error: unknown) => {
      if (!active) return
      setLoadError(errorText(error))
      setLoading(false)
    })
    return () => { active = false }
  }, [params.item.file, params.item.id, room, updateRoom])

  useEffect(() => {
    if (!room) return
    if (!objectName) setObjectName(room.instances[0]?.object || objectItems[0]?.name || '')
    if (!tileBackground) {
      const first = room.tiles[0]?.background || backgroundItems.find((item) => item.background?.tileSet)?.name || backgroundItems[0]?.name || ''
      setTileBackground(first)
    }
    if (room.tiles.length && !room.tiles.some((tile) => tile.depth === tileDepth)) setTileDepth(room.tiles[0].depth)
  }, [backgroundItems, objectItems, objectName, room, tileBackground, tileDepth])

  useEffect(() => {
    function selectObject(event: Event): void {
      const item = (event as CustomEvent<ResourceItem>).detail
      if (!item || item.kind !== 'resource' || item.type !== 'object') return
      setObjectName(item.name)
      setSelectedInstance('')
      setPage('objects')
    }

    window.addEventListener('opengms:resource-selected', selectObject)
    return () => window.removeEventListener('opengms:resource-selected', selectObject)
  }, [])

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => {
    function show(result: CodeSearchResult): void {
      searchTarget.current = result
      if (!room) return
      if (result.kind === 'room') {
        setPage('settings')
        setCodeOpen(true)
        requestCodeReveal({
          id: `${params.item.id}/creation-code`,
          line: result.line,
          column: result.column,
          length: result.length
        })
        searchTarget.current = null
        return
      }
      if (result.kind !== 'room-instance' || !result.instanceName) return
      const instance = room.instances.find((item) => item.name === result.instanceName)
      if (!instance) return
      setPage('objects')
      setSelectedInstance(instance.name)
      setInstanceCode(instance.name)
      requestCodeReveal({
        id: `${params.item.id}/instance/${instance.name}`,
        line: result.line,
        column: result.column,
        length: result.length
      })
      searchTarget.current = null
    }

    if (searchTarget.current) show(searchTarget.current)
    return listenSearchReveal(params.item.id, show)
  }, [params.item.id, room])

  if (loading) {
    return <div className="room-empty"><Map size={34} /><strong>Opening room</strong><span>Reading room contents…</span></div>
  }
  if (!room || !project) {
    return <div className="room-empty"><Map size={34} /><strong>Room is unavailable</strong><span>{loadError || 'The room file could not be parsed.'}</span></div>
  }

  const data = room
  const background = data.backgrounds[backgroundIndex]
  const view = data.views[viewIndex]
  const tileData = tileItem?.background
  const tileWidth = Math.max(1, tileData?.tileWidth || tileData?.width || 32)
  const tileHeight = Math.max(1, tileData?.tileHeight || tileData?.height || 32)
  const tileLayers = [...new Set([...data.tiles.map((tile) => tile.depth), tileDepth])].sort((left, right) => right - left)
  const currentTransform = selected || place
  const currentAlpha = ((currentTransform.color >>> 24) & 0xff)
  const codeInstance = data.instances.find((item) => item.name === instanceCode)
  function change(next: RoomData): void {
    editVersion.current += 1
    setRoom(next)
    setDirty(true)
  }

  function patch(value: Partial<RoomData>): void {
    change({ ...data, ...value })
  }

  function patchBackground(value: Partial<RoomBackground>): void {
    patch({ backgrounds: data.backgrounds.map((item, index) => index === backgroundIndex ? { ...item, ...value } : item) })
  }

  function patchView(value: Partial<RoomView>): void {
    patch({ views: data.views.map((item, index) => index === viewIndex ? { ...item, ...value } : item) })
  }

  function patchInstance(name: string, value: Partial<RoomInstance>): void {
    patch({ instances: data.instances.map((item) => item.name === name ? { ...item, ...value } : item) })
  }

  function patchTransform(value: Partial<Pick<RoomInstance, 'scaleX' | 'scaleY' | 'rotation' | 'color'>>): void {
    if (selected) patchInstance(selected.name, value)
    else setPlace((current) => ({ ...current, ...value }))
  }

  async function save(): Promise<void> {
    if (!room || !dirty || saving) return
    const snapshot = copyRoom(room)
    const version = editVersion.current
    setSaving(true)
    try {
      await window.openGms.saveRoom(params.item.file, snapshot)
      updateRoom(params.item.id, copyRoom(snapshot))
      if (editVersion.current === version) setDirty(false)
      addLog(`Saved room ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save room ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  function addInstance(x: number, y: number): void {
    if (!objectName) return
    const used = new Set(data.instances.map((item) => item.name))
    const instance: RoomInstance = {
      object: objectName,
      x,
      y,
      name: token('inst', used),
      locked: false,
      code: '',
      scaleX: place.scaleX,
      scaleY: place.scaleY,
      color: place.color,
      rotation: place.rotation,
      extra: {}
    }
    const rest = deleteObjects ? data.instances.filter((item) => item.x !== x || item.y !== y) : data.instances
    patch({ instances: [...rest, instance] })
    setSelectedInstance(instance.name)
  }

  function moveInstance(name: string, x: number, y: number): void {
    patchInstance(name, { x, y })
  }

  function finishMoveInstance(name: string, x: number, y: number): void {
    if (!deleteObjects) return
    patch({
      instances: data.instances
        .filter((item) => item.name === name || item.x !== x || item.y !== y)
        .map((item) => item.name === name ? { ...item, x, y } : item)
    })
  }

  function resizeInstance(name: string, x: number, y: number, scaleX: number, scaleY: number): void {
    patchInstance(name, { x, y, scaleX, scaleY })
  }

  function deleteInstance(name: string): void {
    patch({ instances: data.instances.filter((item) => item.name !== name) })
    if (selectedInstance === name) setSelectedInstance('')
  }

  function addTile(x: number, y: number): void {
    if (!tileBackground || !tileData) return
    const used = new Set(data.tiles.map((item) => item.name))
    const id = Math.max(10000000, ...data.tiles.map((item) => item.id)) + 1
    const tile: RoomTile = {
      background: tileBackground,
      x,
      y,
      width: tileWidth,
      height: tileHeight,
      sourceX: tileSource.x,
      sourceY: tileSource.y,
      id,
      name: token('inst', used),
      depth: tileDepth,
      locked: false,
      color: 0xffffffff,
      scaleX: 1,
      scaleY: 1
    }
    const rest = deleteTiles
      ? data.tiles.filter((item) => item.depth !== tileDepth || item.x !== x || item.y !== y)
      : data.tiles
    patch({ tiles: [...rest, tile] })
  }

  function deleteTile(id: number): void {
    patch({ tiles: data.tiles.filter((item) => item.id !== id) })
  }

  function pickTile(event: React.MouseEvent<HTMLDivElement>): void {
    if (!tileData) return
    const image = event.currentTarget.querySelector<HTMLElement>('.room-tile-image')
    if (!image) return
    const rect = image.getBoundingClientRect()
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return
    const x = (event.clientX - rect.left) * tileData.width / rect.width
    const y = (event.clientY - rect.top) * tileData.height / rect.height
    const stepX = tileWidth + Math.max(0, tileData.tileHSeparation)
    const stepY = tileHeight + Math.max(0, tileData.tileVSeparation)
    const column = Math.max(0, Math.floor((x - tileData.tileXOffset) / stepX))
    const row = Math.max(0, Math.floor((y - tileData.tileYOffset) / stepY))
    setTileSource({
      x: Math.min(Math.max(0, tileData.width - tileWidth), tileData.tileXOffset + column * stepX),
      y: Math.min(Math.max(0, tileData.height - tileHeight), tileData.tileYOffset + row * stepY)
    })
  }

  function settingsPage(): React.JSX.Element {
    return (
      <>
        <Group title="Room">
          <label className="room-text-field"><span>Name</span><ResourceName item={params.item} /></label>
          <div className="room-field-grid"><Field label="Width" value={data.width} min={1} onChange={(width) => patch({ width })} /><Field label="Height" value={data.height} min={1} onChange={(height) => patch({ height })} /></div>
          <Field label="Speed" value={data.speed} min={1} onChange={(speed) => patch({ speed })} />
          <CheckField label="Persistent" checked={data.persistent} onChange={(persistent) => patch({ persistent })} />
          <CheckField label="Clear display buffer with window colour" checked={data.clearDisplayBuffer} onChange={(clearDisplayBuffer) => patch({ clearDisplayBuffer })} />
        </Group>
        <Group title="Code and order">
          <button className="room-wide-button" onClick={() => setCodeOpen(true)}><Braces size={15} /> Creation Code</button>
          <button className="room-wide-button" onClick={() => setOrderOpen(true)}><Layers3 size={15} /> Instance Order</button>
        </Group>
        <div className="room-stats"><span><strong>{data.instances.length}</strong>Instances</span><span><strong>{data.tiles.length}</strong>Tiles</span></div>
      </>
    )
  }

  function tilesPage(): React.JSX.Element {
    const image = tileData?.image ? assetUrl(tileData.image, params.projectPath, imageVersion) : ''
    const left = tileData ? tileSource.x / Math.max(1, tileData.width) * 100 : 0
    const top = tileData ? tileSource.y / Math.max(1, tileData.height) * 100 : 0
    const width = tileData ? tileWidth / Math.max(1, tileData.width) * 100 : 0
    const height = tileData ? tileHeight / Math.max(1, tileData.height) * 100 : 0
    return (
      <>
        <Group title="Tile sheet">
          <div className="room-tile-preview" onClick={pickTile}>
            {image ? (
              <div className="room-tile-image">
                <img src={image} alt="" />
                <span className="room-tile-selection" style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, height: `${height}%` }} />
              </div>
            ) : <div className="room-preview-empty"><Grid3X3 size={24} /><span>No tile sheet</span></div>}
          </div>
          <ResourceSelect value={tileBackground} options={backgroundItems} project={project} placeholder="Search backgrounds" onChange={(value) => { setTileBackground(value); setTileSource({ x: 0, y: 0 }) }} />
          <div className="room-field-grid"><Field label="X" value={tileSource.x} min={0} onChange={(x) => setTileSource((value) => ({ ...value, x }))} /><Field label="Y" value={tileSource.y} min={0} onChange={(y) => setTileSource((value) => ({ ...value, y }))} /></div>
          <CheckField label="Delete underlying" checked={deleteTiles} onChange={setDeleteTiles} />
        </Group>
        <Group title="Tile layer">
          <label className="room-text-field"><span>Current layer</span><select value={tileDepth} onChange={(event) => setTileDepth(Number(event.target.value))}>{tileLayers.map((depth) => <option key={depth} value={depth}>Layer {depth}</option>)}</select></label>
          <Field label="Depth" value={tileDepth} onChange={setTileDepth} />
          <CheckField label="Hide other layers" checked={hideOtherLayers} onChange={setHideOtherLayers} />
          <div className="room-button-row">
            <button onClick={() => setTileDepth(Math.min(...tileLayers) - 100)}><Plus size={14} /> Add</button>
            <button className="danger" onClick={() => patch({ tiles: data.tiles.filter((tile) => tile.depth !== tileDepth) })} disabled={!data.tiles.some((tile) => tile.depth === tileDepth)}><Trash2 size={14} /> Delete</button>
          </div>
        </Group>
        <p className="room-help">Left click places a tile. Right click deletes one. Hold Alt to place without snapping.</p>
      </>
    )
  }

  function backgroundsPage(): React.JSX.Element {
    return (
      <>
        <Group title="Room colour">
          <CheckField label="Draw background colour" checked={data.showColor} onChange={(showColor) => patch({ showColor })} />
          <label className="room-color-field"><span>Colour</span><input type="color" value={hexColor(data.color)} onChange={(event) => patch({ color: roomColor(event.target.value) })} /></label>
        </Group>
        <Group title="Background layers">
          <div className="room-slot-list">{data.backgrounds.map((item, index) => <button key={index} className={index === backgroundIndex ? 'selected' : ''} onClick={() => setBackgroundIndex(index)}><span>Background {index}</span><small>{item.name || 'None'}</small></button>)}</div>
        </Group>
        <Group title={`Background ${backgroundIndex}`}>
          <CheckField label="Visible when room starts" checked={background.visible} onChange={(visible) => patchBackground({ visible })} />
          <CheckField label="Foreground image" checked={background.foreground} onChange={(foreground) => patchBackground({ foreground })} />
          <ResourceSelect value={background.name} options={backgroundItems} project={project} emptyLabel="No background" placeholder="Search backgrounds" onChange={(name) => patchBackground({ name })} />
          <div className="room-paired-check"><CheckField label="Tile horizontally" checked={background.tileX} onChange={(tileX) => patchBackground({ tileX })} /><Field label="X" value={background.x} onChange={(x) => patchBackground({ x })} /></div>
          <div className="room-paired-check"><CheckField label="Tile vertically" checked={background.tileY} onChange={(tileY) => patchBackground({ tileY })} /><Field label="Y" value={background.y} onChange={(y) => patchBackground({ y })} /></div>
          <CheckField label="Stretch" checked={background.stretch} onChange={(stretch) => patchBackground({ stretch })} />
          <div className="room-field-grid"><Field label="H speed" value={background.speedX} onChange={(speedX) => patchBackground({ speedX })} /><Field label="V speed" value={background.speedY} onChange={(speedY) => patchBackground({ speedY })} /></div>
        </Group>
      </>
    )
  }

  function viewsPage(): React.JSX.Element {
    return (
      <>
        <Group title="View settings">
          <CheckField label="Enable the use of views" checked={data.enableViews} onChange={(enableViews) => patch({ enableViews })} />
          <CheckField label="Clear background with window colour" checked={data.clearViewBackground} onChange={(clearViewBackground) => patch({ clearViewBackground })} />
          <div className="room-slot-list compact">{data.views.map((item, index) => <button key={index} className={index === viewIndex ? 'selected' : ''} onClick={() => setViewIndex(index)}><span>View {index}</span><small>{item.visible ? 'Visible' : 'Hidden'}</small></button>)}</div>
          <CheckField label="Visible when room starts" checked={view.visible} onChange={(visible) => patchView({ visible })} />
        </Group>
        <Group title="View in room">
          <div className="room-field-grid"><Field label="X" value={view.x} onChange={(x) => patchView({ x })} /><Field label="Y" value={view.y} onChange={(y) => patchView({ y })} /><Field label="W" value={view.width} min={1} onChange={(width) => patchView({ width })} /><Field label="H" value={view.height} min={1} onChange={(height) => patchView({ height })} /></div>
        </Group>
        <Group title="Port on screen">
          <div className="room-field-grid"><Field label="X" value={view.portX} onChange={(portX) => patchView({ portX })} /><Field label="Y" value={view.portY} onChange={(portY) => patchView({ portY })} /><Field label="W" value={view.portWidth} min={1} onChange={(portWidth) => patchView({ portWidth })} /><Field label="H" value={view.portHeight} min={1} onChange={(portHeight) => patchView({ portHeight })} /></div>
        </Group>
        <Group title="Object following">
          <ResourceSelect value={view.object} options={objectItems} project={project} emptyLabel="No object" placeholder="Search objects" onChange={(object) => patchView({ object })} />
          <div className="room-field-grid"><Field label="H border" value={view.borderX} min={0} onChange={(borderX) => patchView({ borderX })} /><Field label="V border" value={view.borderY} min={0} onChange={(borderY) => patchView({ borderY })} /><Field label="H speed" value={view.speedX} onChange={(speedX) => patchView({ speedX })} /><Field label="V speed" value={view.speedY} onChange={(speedY) => patchView({ speedY })} /></div>
        </Group>
      </>
    )
  }

  function physicsPage(): React.JSX.Element {
    const physics = data.physics
    return (
      <Group title="Physics world">
        <CheckField label="Room is Physics World" checked={physics.enabled} onChange={(enabled) => patch({ physics: { ...physics, enabled } })} />
        <div className="room-field-grid"><Field label="Gravity X" value={physics.gravityX} step={0.1} disabled={!physics.enabled} onChange={(gravityX) => patch({ physics: { ...physics, gravityX } })} /><Field label="Gravity Y" value={physics.gravityY} step={0.1} disabled={!physics.enabled} onChange={(gravityY) => patch({ physics: { ...physics, gravityY } })} /></div>
        <Field label="Pixels to meters" value={physics.pixelsToMeters} step={0.01} min={0.000001} disabled={!physics.enabled} onChange={(pixelsToMeters) => patch({ physics: { ...physics, pixelsToMeters } })} />
        <details className="room-physics-bounds"><summary>World bounds</summary><div className="room-field-grid"><Field label="Left" value={physics.left} disabled={!physics.enabled} onChange={(left) => patch({ physics: { ...physics, left } })} /><Field label="Top" value={physics.top} disabled={!physics.enabled} onChange={(top) => patch({ physics: { ...physics, top } })} /><Field label="Right" value={physics.right} disabled={!physics.enabled} onChange={(right) => patch({ physics: { ...physics, right } })} /><Field label="Bottom" value={physics.bottom} disabled={!physics.enabled} onChange={(bottom) => patch({ physics: { ...physics, bottom } })} /></div></details>
      </Group>
    )
  }

  function objectsPage(): React.JSX.Element {
    const image = selectedObjectItem?.image ? assetUrl(selectedObjectItem.image, params.projectPath, imageVersion) : ''
    const editObject = (): void => {
      if (!selectedObjectItem) return
      window.dispatchEvent(new CustomEvent('opengms:open-object', { detail: selectedObjectItem }))
    }
    return (
      <>
        <Group title={selected ? 'Selected instance' : 'Object placement'}>
          <div className="room-object-preview">{image ? <img src={image} alt="" /> : <Box size={30} />}<div><strong>{displayObject || 'No object'}</strong><span>{selected?.name || 'Choose an object to place'}</span></div></div>
          {selected && <label className="room-text-field"><span>Instance</span><input value={selected.name} readOnly /></label>}
          <div className="room-field-grid"><Field label="X" value={selected?.x ?? 0} disabled={!selected} onChange={(x) => selected && patchInstance(selected.name, { x })} /><Field label="Y" value={selected?.y ?? 0} disabled={!selected} onChange={(y) => selected && patchInstance(selected.name, { y })} /></div>
          <Field label="Rotation" value={currentTransform.rotation} onChange={(rotation) => patchTransform({ rotation })} />
          <div className="room-field-grid"><Field label="Scale X" value={currentTransform.scaleX} step={0.1} onChange={(scaleX) => patchTransform({ scaleX })} /><Field label="Scale Y" value={currentTransform.scaleY} step={0.1} onChange={(scaleY) => patchTransform({ scaleY })} /></div>
          <div className="room-color-row"><label className="room-color-field"><span>Colour</span><input type="color" value={hexColor(currentTransform.color)} onChange={(event) => patchTransform({ color: roomColor(event.target.value, currentAlpha) })} /></label><Field label="Alpha" value={currentAlpha} min={0} max={255} onChange={(alpha) => patchTransform({ color: roomColor(hexColor(currentTransform.color), Math.max(0, Math.min(255, alpha))) })} /></div>
          <div className="room-button-row"><button onClick={() => patchTransform({ scaleX: -currentTransform.scaleX })}>Flip X</button><button onClick={() => patchTransform({ scaleY: -currentTransform.scaleY })}>Flip Y</button></div>
          {selected && <div className="room-button-row"><button onClick={editObject} disabled={!selectedObjectItem}><SquarePen size={14} /> Edit Object</button><button onClick={() => setInstanceCode(selected.name)}><Braces size={14} /> Creation Code</button></div>}
          {selected && <button className="room-wide-button danger" onClick={() => deleteInstance(selected.name)}><Trash2 size={14} /> Delete selected</button>}
        </Group>
        <Group title="Object to add with left mouse">
          <ResourceSelect value={objectName} options={objectItems} project={project} placeholder="Search objects" onChange={setObjectName} />
          <div className="room-tree-tip"><Info size={14} /><span><strong>Tip:</strong> You can also select an Object in the resource tree.</span></div>
          <CheckField label="Delete underlying" checked={deleteObjects} onChange={setDeleteObjects} />
        </Group>
      </>
    )
  }

  const content: Record<RoomPage, () => React.JSX.Element> = {
    settings: settingsPage,
    tiles: tilesPage,
    backgrounds: backgroundsPage,
    views: viewsPage,
    physics: physicsPage,
    objects: objectsPage
  }

  return (
    <section className="room-editor">
      <header className="room-editor-head">
        <div className="sprite-title room-title"><span className="sprite-title-icon"><Map size={18} /></span><div><strong>{params.item.name}</strong><small>{data.width} × {data.height} · {data.instances.length} instances</small></div></div>
        <div className="room-toolbar">
          <label>Snap X<input type="number" min={1} value={data.snapX} onChange={(event) => patch({ snapX: Math.max(1, Number(event.target.value) || 1) })} /></label>
          <label>Y<input type="number" min={1} value={data.snapY} onChange={(event) => patch({ snapY: Math.max(1, Number(event.target.value) || 1) })} /></label>
          <button className={showGrid ? 'active' : ''} onClick={() => setShowGrid((value) => !value)} title="Toggle grid"><Grid3X3 size={15} /></button>
        </div>
        <EditorOk api={api} />
      </header>
      <div className="room-editor-body">
        <aside className="room-sidebar">
          <nav>{pages.map(({ id, name, icon: Icon }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon size={15} /><span>{name}</span></button>)}</nav>
          <div className="room-sidebar-content">{content[page]()}</div>
        </aside>
        <RoomCanvas
          room={data}
          project={project}
          projectPath={params.projectPath}
          imageVersion={imageVersion}
          page={page}
          showGrid={showGrid}
          viewIndex={viewIndex}
          selectedInstance={selectedInstance}
          tileDepth={tileDepth}
          hideOtherLayers={hideOtherLayers}
          objectPlacement={{ object: objectName, ...place }}
          tilePlacement={{
            background: tileBackground,
            sourceX: tileSource.x,
            sourceY: tileSource.y,
            width: tileWidth,
            height: tileHeight
          }}
          onSelectInstance={setSelectedInstance}
          onMoveInstance={moveInstance}
          onFinishMoveInstance={finishMoveInstance}
          onResizeInstance={resizeInstance}
          onAddInstance={addInstance}
          onDeleteInstance={deleteInstance}
          onAddTile={addTile}
          onDeleteTile={deleteTile}
        />
      </div>
      {codeOpen && <CodeDialog id={`${params.item.id}/creation-code`} title={`${params.item.name} · Creation Code`} subtitle="Room creation code" value={data.code} onChange={(code) => patch({ code })} onClose={() => setCodeOpen(false)} />}
      {codeInstance && <CodeDialog id={`${params.item.id}/instance/${codeInstance.name}`} title={`${codeInstance.object} · ${codeInstance.name}`} subtitle="Instance creation code" value={codeInstance.code} onChange={(code) => patchInstance(codeInstance.name, { code })} onClose={() => setInstanceCode('')} />}
      {orderOpen && <OrderDialog instances={data.instances} onChange={(instances) => patch({ instances })} onClose={() => setOrderOpen(false)} />}
    </section>
  )
}
