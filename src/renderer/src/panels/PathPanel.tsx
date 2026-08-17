import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Grid3X3,
  ListPlus,
  Plus,
  Route,
  Trash2
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { PathData, PathPoint, Project, ProjectItem, ResourceType, RoomData } from '../../../shared/types'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { ResourceSelect } from '../ResourceSelect'
import { useSave } from '../save'
import { useApp } from '../store'
import { PathCanvas } from './PathCanvas'

type PathItem = Extract<ProjectItem, { kind: 'resource' }>
type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

export type PathParams = {
  item: PathItem
  projectPath: string
}

function copyPath(path: PathData): PathData {
  return { ...path, points: path.points.map((point) => ({ ...point })) }
}

function items(project: Project | null, type: ResourceType): ResourceItem[] {
  const result: ResourceItem[] = []
  function visit(list: ProjectItem[]): void {
    for (const item of list) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }
  for (const group of project?.groups ?? []) visit(group.items)
  return result
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function NumberField({
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
    <label className="path-number-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => {
          const next = Number(event.target.value)
          if (Number.isFinite(next)) onChange(next)
        }}
      />
    </label>
  )
}

export function PathPanel({ params, api }: IDockviewPanelProps<PathParams>): React.JSX.Element {
  const source = params.item.pathData
  const [path, setPath] = useState<PathData | null>(() => source ? copyPath(source) : null)
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [selected, setSelected] = useState(source?.points.length ? 0 : -1)
  const [saving, setSaving] = useState(false)
  const [showGrid, setShowGrid] = useState(true)
  const [room, setRoom] = useState<RoomData | null>(null)
  const [roomLoading, setRoomLoading] = useState(false)
  const project = useApp((state) => state.project)
  const imageVersion = useApp((state) => state.imageVersion)
  const updatePath = useApp((state) => state.updatePath)
  const updateRoom = useApp((state) => state.updateRoom)
  const addLog = useApp((state) => state.addLog)
  const rooms = useMemo(() => items(project, 'room'), [project])
  const roomItem = path && path.backgroundRoom >= 0 ? rooms[path.backgroundRoom] : undefined
  const dirty = path ? JSON.stringify(path) !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => {
    if (!roomItem) {
      setRoom(null)
      setRoomLoading(false)
      return
    }
    if (roomItem.room) {
      setRoom(roomItem.room)
      setRoomLoading(false)
      return
    }
    let active = true
    setRoom(null)
    setRoomLoading(true)
    void window.openGms.readRoom(roomItem.file).then((value) => {
      if (!active) return
      setRoom(value)
      updateRoom(roomItem.id, value)
      setRoomLoading(false)
    }).catch(() => {
      if (!active) return
      setRoomLoading(false)
    })
    return () => { active = false }
  }, [roomItem?.file, roomItem?.id, roomItem?.room, updateRoom])

  if (!path || !project) {
    return <div className="path-empty"><Route size={34} /><strong>Path data is unavailable</strong><span>The path descriptor is missing or could not be parsed.</span></div>
  }

  const data = path
  const point = data.points[selected]

  function patch(values: Partial<PathData>): void {
    setPath((current) => current ? { ...current, ...values } : current)
  }

  function changePoint(index: number, values: Partial<PathPoint>): void {
    setPath((current) => current ? {
      ...current,
      points: current.points.map((item, position) => position === index ? { ...item, ...values } : item)
    } : current)
  }

  function addPoint(x?: number, y?: number, insert = false): void {
    const base = data.points[selected] ?? data.points[data.points.length - 1] ?? { x: 0, y: 0, speed: 100 }
    const next = { x: x ?? base.x, y: y ?? base.y, speed: base.speed }
    const index = insert && selected >= 0 ? selected : data.points.length
    const points = [...data.points]
    points.splice(index, 0, next)
    setPath({ ...data, points })
    setSelected(index)
  }

  function deletePoint(index = selected): void {
    if (index < 0 || index >= data.points.length) return
    const points = data.points.filter((_point, position) => position !== index)
    setPath({ ...data, points })
    setSelected(points.length ? Math.min(index, points.length - 1) : -1)
  }

  function movePoint(offset: number): void {
    if (selected < 0) return
    const target = selected + offset
    if (target < 0 || target >= data.points.length) return
    const points = [...data.points]
    const [value] = points.splice(selected, 1)
    points.splice(target, 0, value)
    setPath({ ...data, points })
    setSelected(target)
  }

  function reverse(): void {
    setPath({ ...data, points: [...data.points].reverse() })
    setSelected(selected < 0 ? -1 : data.points.length - selected - 1)
  }

  async function save(): Promise<void> {
    if (!path || !dirty || saving) return
    const snapshot = copyPath(path)
    setSaving(true)
    try {
      await window.openGms.savePath(params.item.file, snapshot)
      updatePath(params.item.id, copyPath(snapshot))
      setSaved(JSON.stringify(snapshot))
      addLog(`Saved path ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save path ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="path-editor">
      <header className="path-editor-head">
        <div className="path-title"><span><Route size={18} /></span><div><ResourceName className="resource-title-name" item={params.item} /><small>{data.points.length} points · {data.kind === 1 ? 'Smooth' : 'Straight'}</small></div></div>
        <div className="path-toolbar">
          <button onClick={reverse} disabled={data.points.length < 2} title="Reverse points"><ArrowLeftRight size={15} /></button>
          <label>Snap X<input type="number" min={1} value={data.snapX} onChange={(event) => patch({ snapX: Math.max(1, Math.trunc(Number(event.target.value) || 1)) })} /></label>
          <label>Y<input type="number" min={1} value={data.snapY} onChange={(event) => patch({ snapY: Math.max(1, Math.trunc(Number(event.target.value) || 1)) })} /></label>
          <button className={showGrid ? 'active' : ''} onClick={() => setShowGrid((value) => !value)} title="Toggle grid"><Grid3X3 size={15} /></button>
          <div className="path-room-select">
            <span>Room background</span>
            <ResourceSelect
              value={roomItem?.name ?? ''}
              options={rooms}
              emptyLabel="None"
              placeholder="Search rooms"
              onChange={(name) => patch({ backgroundRoom: name ? rooms.findIndex((item) => item.name === name) : -1 })}
            />
          </div>
          {roomLoading && <span className="path-room-loading">Loading room…</span>}
        </div>
        <EditorOk api={api} />
      </header>
      <div className="path-editor-body">
        <aside className="path-sidebar">
          <section className="path-points">
            <header><strong>Points</strong><span>{data.points.length}</span></header>
            <div className="path-point-list">
              {data.points.map((item, index) => (
                <button key={index} className={selected === index ? 'selected' : ''} onClick={() => setSelected(index)}>
                  <span>{index + 1}</span><strong>({item.x}, {item.y})</strong><small>{item.speed}</small>
                </button>
              ))}
              {!data.points.length && <div className="path-no-points">Click the canvas or Add to create a point.</div>}
            </div>
            <div className="path-point-actions">
              <button onClick={() => addPoint()}><Plus size={14} /> Add</button>
              <button onClick={() => addPoint(undefined, undefined, true)}><ListPlus size={14} /> Insert</button>
              <button onClick={() => deletePoint()} disabled={!point}><Trash2 size={14} /> Delete</button>
            </div>
            <div className="path-order-actions">
              <button onClick={() => movePoint(-1)} disabled={selected <= 0}><ArrowUp size={14} /> Up</button>
              <button onClick={() => movePoint(1)} disabled={selected < 0 || selected >= data.points.length - 1}><ArrowDown size={14} /> Down</button>
            </div>
          </section>
          <section className="path-section">
            <h3>Selected point</h3>
            <div className="path-field-grid">
              <NumberField label="X" value={point?.x ?? 0} disabled={!point} onChange={(x) => changePoint(selected, { x })} />
              <NumberField label="Y" value={point?.y ?? 0} disabled={!point} onChange={(y) => changePoint(selected, { y })} />
            </div>
            <NumberField label="Speed" value={point?.speed ?? 100} disabled={!point} onChange={(speed) => changePoint(selected, { speed })} />
          </section>
          <section className="path-section">
            <h3>Connection</h3>
            <label className="path-choice"><input type="radio" name={`${api.id}-kind`} checked={data.kind === 0} onChange={() => patch({ kind: 0 })} /><span>Straight lines</span></label>
            <label className="path-choice"><input type="radio" name={`${api.id}-kind`} checked={data.kind === 1} onChange={() => patch({ kind: 1 })} /><span>Smooth curve</span></label>
            <label className="path-choice"><input type="checkbox" checked={data.closed} onChange={(event) => patch({ closed: event.target.checked })} /><span>Closed</span></label>
            <NumberField label="Precision" value={data.precision} min={1} max={8} disabled={data.kind === 0} onChange={(precision) => patch({ precision: Math.max(1, Math.min(8, Math.trunc(precision))) })} />
          </section>
          <p className="path-help">Click empty space to add a point. Drag points to move them, right click to delete, hold Alt to ignore snapping, middle drag to pan, and use the wheel to zoom.</p>
        </aside>
        <PathCanvas
          path={data}
          room={room}
          project={project}
          projectPath={params.projectPath}
          imageVersion={imageVersion}
          selected={selected}
          showGrid={showGrid}
          onSelect={setSelected}
          onAdd={(x, y) => addPoint(x, y)}
          onMove={(index, x, y) => changePoint(index, { x, y })}
          onDelete={deletePoint}
        />
      </div>
    </section>
  )
}
