import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  Box,
  Boxes,
  Braces,
  ChevronLeft,
  CircleDot,
  Clock3,
  Footprints,
  Image as ImageIcon,
  Keyboard,
  KeyRound,
  MousePointer2,
  Paintbrush,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
  Zap,
  type LucideIcon
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  ActionInfo,
  ActionLibrary,
  ObjectAction,
  ObjectData,
  ObjectEvent,
  Project,
  ProjectItem,
  ResourceType
} from '../../../shared/types'
import { assetUrl } from '../assets'
import { CodeEditor } from '../CodeEditor'
import { requestCodeReveal } from '../codeReveal'
import { listenSearchReveal } from '../codeSearch'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { ResourceSelect } from '../ResourceSelect'
import { useSave } from '../save'
import { useApp } from '../store'

type ObjectItem = Extract<ProjectItem, { kind: 'resource' }>
type PickerGroup =
  | 'alarm'
  | 'step'
  | 'collision'
  | 'keyboard'
  | 'mouse'
  | 'other'
  | 'draw'
  | 'keypress'
  | 'keyrelease'
  | 'async'

export type ObjectParams = {
  item: ObjectItem
  projectPath: string
}

type EventCategory = {
  id: string
  label: string
  icon: LucideIcon
  event?: ObjectEvent
  group?: PickerGroup
}

const eventCategories: EventCategory[] = [
  { id: 'create', label: 'Create', icon: Sparkles, event: makeEvent(0) },
  { id: 'mouse', label: 'Mouse', icon: MousePointer2, group: 'mouse' },
  { id: 'destroy', label: 'Destroy', icon: Trash2, event: makeEvent(1) },
  { id: 'other', label: 'Other', icon: CircleDot, group: 'other' },
  { id: 'alarm', label: 'Alarm', icon: AlarmClock, group: 'alarm' },
  { id: 'draw', label: 'Draw', icon: Paintbrush, group: 'draw' },
  { id: 'step', label: 'Step', icon: Footprints, group: 'step' },
  { id: 'keypress', label: 'Key Press', icon: KeyRound, group: 'keypress' },
  { id: 'collision', label: 'Collision', icon: Boxes, group: 'collision' },
  { id: 'keyrelease', label: 'Key Release', icon: Keyboard, group: 'keyrelease' },
  { id: 'keyboard', label: 'Keyboard', icon: Keyboard, group: 'keyboard' },
  { id: 'async', label: 'Asynchronous', icon: Zap, group: 'async' }
]

const mouseNames: Record<number, string> = {
  0: 'Left Button',
  1: 'Right Button',
  2: 'Middle Button',
  3: 'No Button',
  4: 'Left Pressed',
  5: 'Right Pressed',
  6: 'Middle Pressed',
  7: 'Left Released',
  8: 'Right Released',
  9: 'Middle Released',
  10: 'Mouse Enter',
  11: 'Mouse Leave',
  50: 'Global Left Button',
  51: 'Global Right Button',
  52: 'Global Middle Button',
  53: 'Global Left Pressed',
  54: 'Global Right Pressed',
  55: 'Global Middle Pressed',
  56: 'Global Left Released',
  57: 'Global Right Released',
  58: 'Global Middle Released',
  60: 'Mouse Wheel Up',
  61: 'Mouse Wheel Down'
}

const otherNames: Record<number, string> = {
  0: 'Outside Room',
  1: 'Intersect Boundary',
  2: 'Game Start',
  3: 'Game End',
  4: 'Room Start',
  5: 'Room End',
  6: 'No More Lives',
  7: 'Animation End',
  8: 'End of Path',
  9: 'No More Health',
  30: 'Close Button',
  60: 'Async Image Loaded',
  61: 'Async Sound Loaded',
  62: 'Async HTTP',
  63: 'Async Dialog',
  66: 'Async IAP',
  67: 'Async Cloud',
  68: 'Async Networking',
  69: 'Async Steam',
  70: 'Async Social',
  71: 'Async Push Notification',
  72: 'Async Save / Load',
  73: 'Async Audio Recording',
  74: 'Async Audio Playback',
  75: 'Async System'
}

const drawNames: Record<number, string> = {
  0: 'Draw',
  64: 'Draw GUI',
  65: 'Resize',
  72: 'Begin Draw',
  73: 'End Draw',
  74: 'Begin Draw GUI',
  75: 'End Draw GUI',
  76: 'Pre Draw',
  77: 'Post Draw'
}

const commonKeys: Array<[number, string]> = [
  [0, 'No Key'], [1, 'Any Key'], [37, 'Left'], [39, 'Right'], [38, 'Up'], [40, 'Down'],
  [17, 'Control'], [18, 'Alt'], [16, 'Shift'], [32, 'Space'], [13, 'Enter'],
  [8, 'Backspace'], [27, 'Escape'], [36, 'Home'], [35, 'End'], [33, 'Page Up'],
  [34, 'Page Down'], [46, 'Delete'], [45, 'Insert']
]

let actionRequest: Promise<ActionLibrary[]> | null = null
const actionDragType = 'application/x-opengms-action'

export function loadActions(): Promise<ActionLibrary[]> {
  if (!actionRequest) {
    actionRequest = window.openGms.loadActions().catch((error) => {
      actionRequest = null
      throw error
    })
  }
  return actionRequest
}

function makeEvent(type: number, number = 0, target = ''): ObjectEvent {
  return { type, number, target, actions: [] }
}

function copyObject(object: ObjectData): ObjectData {
  return {
    ...object,
    events: object.events.map((event) => ({
      ...event,
      actions: event.actions.map((action) => ({
        ...action,
        args: action.args.map((arg) => ({ ...arg }))
      }))
    })),
    physics: {
      ...object.physics,
      points: object.physics.points.map((point) => ({ ...point }))
    }
  }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function items(project: Project | null, type: ResourceType): ObjectItem[] {
  const result: ObjectItem[] = []
  function visit(list: ProjectItem[]): void {
    for (const item of list) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }
  for (const group of project?.groups ?? []) {
    if (group.type === type) visit(group.items)
  }
  return result
}

function keyName(code: number): string {
  const common = commonKeys.find(([value]) => value === code)?.[1]
  if (common) return common
  if (code >= 48 && code <= 57) return String.fromCharCode(code)
  if (code >= 65 && code <= 90) return String.fromCharCode(code)
  if (code >= 96 && code <= 105) return `Numpad ${code - 96}`
  if (code >= 112 && code <= 123) return `F${code - 111}`
  return `Key ${code}`
}

function eventName(event: ObjectEvent): string {
  switch (event.type) {
    case 0: return 'Create'
    case 1: return 'Destroy'
    case 2: return `Alarm ${event.number}`
    case 3: return ['Step', 'Begin Step', 'End Step'][event.number] ?? `Step ${event.number}`
    case 4: return `Collision with ${event.target || '<undefined>'}`
    case 5: return `Keyboard ${keyName(event.number)}`
    case 6: return mouseNames[event.number] ?? `Mouse ${event.number}`
    case 7:
      if (event.number >= 10 && event.number <= 25) return `User Event ${event.number - 10}`
      if (event.number >= 40 && event.number <= 47) return `Outside View ${event.number - 40}`
      if (event.number >= 50 && event.number <= 57) return `Boundary View ${event.number - 50}`
      return otherNames[event.number] ?? `Other ${event.number}`
    case 8: return drawNames[event.number] ?? `Draw ${event.number}`
    case 9: return `Key Press ${keyName(event.number)}`
    case 10: return `Key Release ${keyName(event.number)}`
    default: return `Event ${event.type}:${event.number}`
  }
}

function eventKey(event: ObjectEvent): string {
  return event.type === 4
    ? `${event.type}:${event.target.toLocaleLowerCase()}`
    : `${event.type}:${event.number}`
}

function sortEvents(events: ObjectEvent[], objectItems: ObjectItem[]): ObjectEvent[] {
  const objectOrder = new Map(
    objectItems.map((item, index) => [item.name.toLocaleLowerCase(), index])
  )
  return [...events].sort((left, right) => {
    if (left.type !== right.type) return left.type - right.type
    if (left.type !== 4 && left.number !== right.number) return right.number - left.number
    if (left.type === 4) {
      const leftOrder = objectOrder.get(left.target.toLocaleLowerCase()) ?? -1
      const rightOrder = objectOrder.get(right.target.toLocaleLowerCase()) ?? -1
      if (leftOrder !== rightOrder) return rightOrder - leftOrder
      return left.target.localeCompare(right.target, 'en', { numeric: true, sensitivity: 'base' })
    }
    return 0
  })
}

function eventIcon(type: number): LucideIcon {
  return [Sparkles, Trash2, AlarmClock, Footprints, Boxes, Keyboard, MousePointer2, CircleDot, Paintbrush, KeyRound, Keyboard, Zap][type] ?? Zap
}

function pickerOptions(group: PickerGroup, objectItems: ObjectItem[]): Array<{ label: string; event: ObjectEvent }> {
  if (group === 'alarm') {
    return Array.from({ length: 12 }, (_value, number) => ({ label: `Alarm ${number}`, event: makeEvent(2, number) }))
  }
  if (group === 'step') {
    return ['Step', 'Begin Step', 'End Step'].map((label, number) => ({ label, event: makeEvent(3, number) }))
  }
  if (group === 'collision') {
    return objectItems.map((item) => ({ label: item.name, event: makeEvent(4, 0, item.name) }))
  }
  if (group === 'mouse') {
    return Object.entries(mouseNames).map(([number, label]) => ({ label, event: makeEvent(6, Number(number)) }))
  }
  if (group === 'draw') {
    return Object.entries(drawNames).map(([number, label]) => ({ label, event: makeEvent(8, Number(number)) }))
  }
  if (group === 'async') {
    return Object.entries(otherNames)
      .filter(([number]) => Number(number) >= 60)
      .map(([number, label]) => ({ label, event: makeEvent(7, Number(number)) }))
  }
  if (group === 'other') {
    const choices = Object.entries(otherNames)
      .filter(([number]) => Number(number) < 60)
      .map(([number, label]) => ({ label, event: makeEvent(7, Number(number)) }))
    choices.push(...Array.from({ length: 16 }, (_value, number) => ({
      label: `User Event ${number}`,
      event: makeEvent(7, number + 10)
    })))
    return choices
  }

  const type = group === 'keyboard' ? 5 : group === 'keypress' ? 9 : 10
  const keys = [
    ...commonKeys,
    ...Array.from({ length: 10 }, (_value, index) => [48 + index, String(index)] as [number, string]),
    ...Array.from({ length: 26 }, (_value, index) => [65 + index, String.fromCharCode(65 + index)] as [number, string]),
    ...Array.from({ length: 12 }, (_value, index) => [112 + index, `F${index + 1}`] as [number, string])
  ]
  return keys.map(([number, label]) => ({ label, event: makeEvent(type, number) }))
}

function EventPicker({
  title,
  objectItems,
  onPick,
  onCancel
}: {
  title: string
  objectItems: ObjectItem[]
  onPick: (event: ObjectEvent) => void
  onCancel: () => void
}): React.JSX.Element {
  const [group, setGroup] = useState<PickerGroup | null>(null)
  const [query, setQuery] = useState('')
  const options = group ? pickerOptions(group, objectItems) : []
  const shown = options.filter((option) => option.label.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))

  useEffect(() => {
    function close(event: KeyboardEvent): void {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onCancel])

  return (
    <div className="object-dialog-backdrop" role="presentation" onMouseDown={onCancel}>
      <section className="event-picker" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            {group && <button onClick={() => { setGroup(null); setQuery('') }} title="Back"><ChevronLeft size={16} /></button>}
            <strong>{group ? eventCategories.find((item) => item.group === group)?.label : title}</strong>
          </div>
          <button onClick={onCancel} title="Close"><X size={16} /></button>
        </header>
        {!group ? (
          <div className="event-category-grid">
            {eventCategories.map((category) => {
              const Icon = category.icon
              return (
                <button
                  key={category.id}
                  onClick={() => category.event ? onPick(category.event) : setGroup(category.group ?? null)}
                >
                  <Icon size={19} /> <span>{category.label}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <div className="event-option-page">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${eventCategories.find((item) => item.group === group)?.label.toLowerCase()} events`}
            />
            <div className="event-option-list">
              {shown.map((option) => (
                <button key={eventKey(option.event)} onClick={() => onPick(option.event)}>
                  <span>{option.label}</span><Plus size={14} />
                </button>
              ))}
              {shown.length === 0 && <span className="event-no-options">No matching events</span>}
            </div>
          </div>
        )}
        <footer><button onClick={onCancel}>Cancel</button></footer>
      </section>
    </div>
  )
}

export function actionKey(action: Pick<ObjectAction, 'libId' | 'id'> | Pick<ActionInfo, 'libraryId' | 'id'>): string {
  const libraryId = 'libId' in action ? action.libId : action.libraryId
  return `${libraryId}:${action.id}`
}

export function makeAction(info: ActionInfo): ObjectAction {
  return {
    libId: info.libraryId,
    id: info.id,
    kind: info.kind,
    canRelative: info.canRelative,
    question: info.question,
    canApply: info.canApply,
    execType: info.execType,
    functionName: info.execType === 1 ? info.execInfo : '',
    code: info.execType === 2 ? info.execInfo : '',
    appliesTo: 'self',
    relative: false,
    not: false,
    args: info.args.map((arg) => ({ kind: arg.kind, value: arg.defaultValue }))
  }
}

export function makeCodeAction(info?: ActionInfo): ObjectAction {
  if (info) return makeAction(info)
  return {
    libId: 1,
    id: 603,
    kind: 7,
    canRelative: false,
    question: false,
    canApply: true,
    execType: 2,
    functionName: '',
    code: '',
    appliesTo: 'self',
    relative: false,
    not: false,
    args: [{ kind: 1, value: '' }]
  }
}

export function setArg(action: ObjectAction, index: number, value: string): ObjectAction {
  const args = action.args.map((arg) => ({ ...arg }))
  while (args.length <= index) args.push({ kind: 0, value: '' })
  args[index] = { ...args[index], value }
  return { ...action, args }
}

export function actionSummary(action: ObjectAction, info?: ActionInfo): string {
  if (isCodeAction(action, info)) {
    const code = action.args[0]?.value || action.code
    const firstLine = code.replace(/^\uFEFF/, '').split(/\r\n|\r|\n/, 1)[0]
    const comment = /^[\t ]*\/\/\/[\t ]?(.*)$/.exec(firstLine)?.[1].trim()
    return comment || 'Execute a piece of code'
  }
  const text = info?.listText || info?.description || info?.name || `Action ${action.id}`
  return text
    .replace(/@([0-9]+)/g, (_match, index: string) => action.args[Number(index)]?.value || '…')
    .replace(/@[a-z]/gi, '')
    .replace(/#+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isCodeAction(action: ObjectAction, info?: ActionInfo): boolean {
  return action.kind === 7 || info?.interfaceKind === 5
}

export function libraryName(name: string): string {
  if (/^main\d+$/i.test(name)) return `Main ${name.replace(/\D/g, '')}`
  return name ? `${name[0].toUpperCase()}${name.slice(1)}` : 'Actions'
}

const argResource: Partial<Record<number, ResourceType>> = {
  5: 'sprite',
  6: 'sound',
  7: 'background',
  8: 'path',
  9: 'script',
  10: 'object',
  11: 'room',
  12: 'font',
  14: 'timeline'
}

export function ActionEditor({
  id,
  action,
  info,
  project,
  onChange,
  onClose
}: {
  id: string
  action: ObjectAction
  info?: ActionInfo
  project: Project | null
  onChange: (action: ObjectAction) => void
  onClose: () => void
}): React.JSX.Element {
  const codeAction = isCodeAction(action, info)
  const title = info?.description || info?.name || `Action ${action.id}`

  useEffect(() => {
    function close(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <div className="object-dialog-backdrop action-editor-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`action-editor-dialog ${codeAction ? 'code' : ''}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="action-editor-name">
            {info?.icon ? <img src={info.icon} alt="" /> : <Braces size={18} />}
            <div><strong>{title}</strong><small>{info?.name || `Library ${action.libId} · Action ${action.id}`}</small></div>
          </div>
          <button onClick={onClose} title="Close"><X size={16} /></button>
        </header>

        {codeAction ? (
          <CodeEditor
            id={id}
            value={action.args[0]?.value ?? ''}
            eol={(action.args[0]?.value ?? '').includes('\r\n') ? 'crlf' : 'lf'}
            onChange={(value) => onChange(setArg(action, 0, value))}
          />
        ) : (
          <div className="action-editor-form">
            {(action.canApply || info?.canApply) && (
              <div className="object-field">
                <span>Apply To</span>
                <ResourceSelect
                  value={action.appliesTo}
                  options={items(project, 'object')}
                  project={project}
                  fixedOptions={[{ value: 'self', label: 'Self' }, { value: 'other', label: 'Other' }]}
                  allowEmpty={false}
                  placeholder="Search objects"
                  onChange={(appliesTo) => onChange({ ...action, appliesTo })}
                />
              </div>
            )}
            <div className="action-flags">
              {(action.canRelative || info?.canRelative) && (
                <label><input type="checkbox" checked={action.relative} onChange={(event) => onChange({ ...action, relative: event.target.checked })} /> Relative</label>
              )}
              {(action.question || info?.question) && (
                <label><input type="checkbox" checked={action.not} onChange={(event) => onChange({ ...action, not: event.target.checked })} /> Not</label>
              )}
            </div>
            <div className="action-args">
              {action.args.map((arg, index) => {
                const argInfo = info?.args[index]
                const label = argInfo?.caption || `Argument ${index + 1}`
                const resourceType = argResource[arg.kind]
                if (resourceType) {
                  const resourceItems = items(project, resourceType)
                  return (
                    <div className="object-field" key={index}>
                      <span>{label}</span>
                      <ResourceSelect
                        value={arg.value}
                        options={resourceItems}
                        project={project}
                        placeholder={`Search ${resourceType}s`}
                        onChange={(value) => onChange(setArg(action, index, value))}
                      />
                    </div>
                  )
                }
                if (arg.kind === 3) {
                  return (
                    <label className="action-check" key={index}>
                      <input type="checkbox" checked={arg.value !== '0'} onChange={(event) => onChange(setArg(action, index, event.target.checked ? '1' : '0'))} />
                      <span>{label}</span>
                    </label>
                  )
                }
                if (arg.kind === 4 && argInfo?.menu.length) {
                  return (
                    <label className="object-field" key={index}>
                      <span>{label}</span>
                      <select value={arg.value} onChange={(event) => onChange(setArg(action, index, event.target.value))}>
                        {argInfo.menu.map((option, optionIndex) => <option key={optionIndex} value={String(optionIndex)}>{option}</option>)}
                      </select>
                    </label>
                  )
                }
                return (
                  <label className="object-field" key={index}>
                    <span>{label}</span>
                    {arg.kind === 1 ? (
                      <textarea value={arg.value} onChange={(event) => onChange(setArg(action, index, event.target.value))} />
                    ) : (
                      <input value={arg.value} onChange={(event) => onChange(setArg(action, index, event.target.value))} />
                    )}
                  </label>
                )
              })}
              {action.args.length === 0 && <span className="action-no-args">This action has no arguments.</span>}
            </div>
          </div>
        )}
        {!codeAction && <footer><button onClick={onClose}>Done</button></footer>}
      </section>
    </div>
  )
}

export function ObjectPanel({ params, api }: IDockviewPanelProps<ObjectParams>): React.JSX.Element {
  const source = params.item.object
  const project = useApp((state) => state.project)
  const objectItems = useMemo(() => items(project, 'object'), [project])
  const [object, setObject] = useState<ObjectData | null>(() => {
    if (!source) return null
    const initial = copyObject(source)
    initial.events = sortEvents(initial.events, objectItems)
    return initial
  })
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [eventPos, setEventPos] = useState(source?.events.length ? 0 : -1)
  const [actionPos, setActionPos] = useState(-1)
  const [picker, setPicker] = useState<'add' | 'change' | null>(null)
  const [editing, setEditing] = useState(false)
  const [libraries, setLibraries] = useState<ActionLibrary[]>([])
  const [library, setLibrary] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [draggedAction, setDraggedAction] = useState('')
  const [dropActionPos, setDropActionPos] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const imageVersion = useApp((state) => state.imageVersion)
  const updateObject = useApp((state) => state.updateObject)
  const addLog = useApp((state) => state.addLog)
  const dirty = object ? JSON.stringify(object) !== saved : false
  useSave(api.id, dirty, save)
  const spriteItems = useMemo(() => items(project, 'sprite'), [project])
  const actionMap = useMemo(() => new Map(
    libraries.flatMap((item) => item.actions).map((action) => [actionKey(action), action])
  ), [libraries])

  useEffect(() => {
    let active = true
    void loadActions().then((value) => {
      if (!active) return
      setLibraries(value)
      setLibrary((current) => value.some((item) => item.name === current) ? current : value[0]?.name ?? '')
    }).catch((error: unknown) => {
      if (active) setLibraryError(errorText(error))
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => {
    if (!object?.events.length) {
      setEventPos(-1)
      setActionPos(-1)
      setEditing(false)
      return
    }
    if (eventPos >= object.events.length) setEventPos(object.events.length - 1)
  }, [eventPos, object])

  useEffect(() => listenSearchReveal(params.item.id, (result) => {
    if (result.kind !== 'object' || !object || result.actionIndex === undefined) return
    const nextEvent = result.eventKey
      ? object.events.findIndex((event) => eventKey(event) === result.eventKey)
      : result.eventIndex ?? -1
    const event = object.events[nextEvent]
    if (!event?.actions[result.actionIndex]) return
    setEventPos(nextEvent)
    setActionPos(result.actionIndex)
    setEditing(true)
    if (result.codeEditor) {
      requestCodeReveal({
        id: `${params.item.id}/${eventKey(event)}/${result.actionIndex}`,
        line: result.line,
        column: result.column,
        length: result.length
      })
    }
  }), [object, params.item.id])

  if (!object) {
    return (
      <div className="object-empty">
        <Box size={34} />
        <strong>Object data is unavailable</strong>
        <span>The object descriptor is missing or could not be parsed.</span>
      </div>
    )
  }

  const data = object
  const selectedEvent = data.events[eventPos]
  const selectedAction = selectedEvent?.actions[actionPos]
  const selectedInfo = selectedAction ? actionMap.get(actionKey(selectedAction)) : undefined
  const activeLibrary = libraries.find((item) => item.name === library)
  const sprite = spriteItems.find((item) => item.name === data.sprite)
  const children = objectItems.filter((item) => item.object?.parent === params.item.name)

  function patch(change: Partial<ObjectData>): void {
    setObject((current) => current ? { ...current, ...change } : current)
  }

  function changeEvent(index: number, event: ObjectEvent): void {
    const current = data.events[index]
    if (current && eventKey(current) !== eventKey(event)) {
      const events = sortEvents(
        data.events.map((item, position) => position === index ? event : item),
        objectItems
      )
      setObject({ ...data, events })
      setEventPos(events.findIndex((item) => eventKey(item) === eventKey(event)))
      return
    }
    setObject((current) => current ? {
      ...current,
      events: current.events.map((item, position) => position === index ? event : item)
    } : current)
  }

  function changeAction(eventIndex: number, actionIndex: number, action: ObjectAction): void {
    setObject((current) => {
      if (!current) return current
      return {
        ...current,
        events: current.events.map((event, position) => position === eventIndex ? {
          ...event,
          actions: event.actions.map((item, actionPosition) => actionPosition === actionIndex ? action : item)
        } : event)
      }
    })
  }

  async function save(): Promise<void> {
    if (!object || saving) return
    const snapshot = copyObject(object)
    snapshot.events = sortEvents(snapshot.events, objectItems)
    const savedValue = JSON.stringify(snapshot)
    if (savedValue === saved) return
    setSaving(true)
    try {
      await window.openGms.saveObject(params.item.file, snapshot)
      updateObject(params.item.id, snapshot)
      setObject(snapshot)
      setSaved(savedValue)
      addLog(`Saved object ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save object ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  function pickEvent(next: ObjectEvent): void {
    const duplicate = data.events.findIndex((event) => eventKey(event) === eventKey(next))
    if (picker === 'change' && eventPos >= 0) {
      if (duplicate >= 0 && duplicate !== eventPos) {
        setEventPos(duplicate)
      } else {
        changeEvent(eventPos, { ...next, actions: data.events[eventPos].actions })
      }
    } else if (duplicate >= 0) {
      setEventPos(duplicate)
    } else {
      const events = sortEvents([...data.events, next], objectItems)
      patch({ events })
      setEventPos(events.findIndex((event) => eventKey(event) === eventKey(next)))
    }
    setActionPos(-1)
    setEditing(false)
    setPicker(null)
  }

  function deleteEvent(): void {
    if (eventPos < 0) return
    patch({ events: data.events.filter((_event, index) => index !== eventPos) })
    setEventPos(Math.min(eventPos, data.events.length - 2))
    setActionPos(-1)
    setEditing(false)
  }

  function openEventCode(event: ObjectEvent, index: number): void {
    const codeIndex = event.actions.findIndex((action) => (
      isCodeAction(action, actionMap.get(actionKey(action)))
    ))
    setEventPos(index)
    if (codeIndex >= 0) {
      setActionPos(codeIndex)
      setEditing(true)
      return
    }

    const info = actionMap.get('1:603') ?? libraries
      .flatMap((item) => item.actions)
      .find((action) => action.interfaceKind === 5 || action.kind === 7)
    const action = makeCodeAction(info)
    changeEvent(index, { ...event, actions: [...event.actions, action] })
    setActionPos(event.actions.length)
    setEditing(true)
  }

  function addAction(info: ActionInfo, position?: number): void {
    if (!selectedEvent) return
    const action = makeAction(info)
    const index = Math.max(0, Math.min(position ?? selectedEvent.actions.length, selectedEvent.actions.length))
    const actions = [...selectedEvent.actions]
    actions.splice(index, 0, action)
    changeEvent(eventPos, { ...selectedEvent, actions })
    setActionPos(index)
    setEditing(info.args.length > 0 || info.interfaceKind === 5)
  }

  function actionDropIndex(event: React.DragEvent<HTMLDivElement>): number {
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>(':scope > button')
    for (let index = 0; index < buttons.length; index += 1) {
      const bounds = buttons[index].getBoundingClientRect()
      if (event.clientY < bounds.top + bounds.height / 2) return index
    }
    return buttons.length
  }

  function startLibraryDrag(event: React.DragEvent<HTMLButtonElement>, info: ActionInfo): void {
    if (!selectedEvent) {
      event.preventDefault()
      return
    }
    const key = actionKey(info)
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(actionDragType, key)
    event.dataTransfer.setData('text/plain', info.description || info.name)
    setDraggedAction(key)
    setDropActionPos(null)
  }

  function dragOverActions(event: React.DragEvent<HTMLDivElement>): void {
    if (!selectedEvent || !draggedAction) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    const index = actionDropIndex(event)
    setDropActionPos((current) => current === index ? current : index)
  }

  function leaveActions(event: React.DragEvent<HTMLDivElement>): void {
    const next = event.relatedTarget
    if (!(next instanceof Node) || !event.currentTarget.contains(next)) setDropActionPos(null)
  }

  function dropAction(event: React.DragEvent<HTMLDivElement>): void {
    if (!selectedEvent) return
    const key = event.dataTransfer.getData(actionDragType) || draggedAction
    const info = actionMap.get(key)
    if (!info) return
    event.preventDefault()
    const index = actionDropIndex(event)
    setDropActionPos(null)
    setDraggedAction('')
    addAction(info, index)
  }

  function deleteAction(): void {
    if (!selectedEvent || actionPos < 0) return
    changeEvent(eventPos, {
      ...selectedEvent,
      actions: selectedEvent.actions.filter((_action, index) => index !== actionPos)
    })
    setActionPos(Math.min(actionPos, selectedEvent.actions.length - 2))
    setEditing(false)
  }

  function moveAction(step: number): void {
    if (!selectedEvent || actionPos < 0) return
    const target = actionPos + step
    if (target < 0 || target >= selectedEvent.actions.length) return
    const actions = [...selectedEvent.actions]
    ;[actions[actionPos], actions[target]] = [actions[target], actions[actionPos]]
    changeEvent(eventPos, { ...selectedEvent, actions })
    setActionPos(target)
  }

  function editSprite(): void {
    if (sprite) window.dispatchEvent(new CustomEvent('opengms:open-sprite', { detail: sprite }))
  }

  return (
    <section className="object-editor">
      <header className="object-editor-head">
        <div className="sprite-title object-title">
          <span className="sprite-title-icon"><Box size={18} /></span>
          <div><strong>{params.item.name}</strong><small>Object resource</small></div>
        </div>
        <EditorOk api={api} />
      </header>

      <div className="object-editor-body">
        <aside className="object-settings">
          <section className="object-card object-identity">
            <label className="object-field"><span>Name</span><ResourceName item={params.item} /></label>
            <div className="object-field"><span>Sprite</span>
              <ResourceSelect value={data.sprite} options={spriteItems} project={project} placeholder="Search sprites" onChange={(sprite) => patch({ sprite })} />
            </div>
            <div className="object-sprite-preview">
              {sprite?.image ? <img src={assetUrl(sprite.image, params.projectPath, imageVersion)} alt="" /> : <ImageIcon size={25} />}
              <div><strong>{data.sprite || 'No sprite'}</strong><span>{sprite?.missing ? 'Resource is missing' : 'Object appearance'}</span></div>
            </div>
            <div className="object-inline-buttons">
              <button disabled><Plus size={14} /> New</button>
              <button onClick={editSprite} disabled={!sprite}><Pencil size={14} /> Edit</button>
            </div>
          </section>

          <section className="object-card object-options">
            <label><input type="checkbox" checked={data.visible} onChange={(event) => patch({ visible: event.target.checked })} /> Visible</label>
            <label><input type="checkbox" checked={data.solid} onChange={(event) => patch({ solid: event.target.checked })} /> Solid</label>
            <label><input type="checkbox" checked={data.persistent} onChange={(event) => patch({ persistent: event.target.checked })} /> Persistent</label>
            <label><input type="checkbox" checked={data.physics.enabled} onChange={(event) => patch({ physics: { ...data.physics, enabled: event.target.checked } })} /> Uses Physics</label>
          </section>

          <section className="object-card object-links">
            <label className="object-field"><span>Depth</span><input type="number" value={data.depth} onChange={(event) => patch({ depth: Number(event.target.value) || 0 })} /></label>
            <div className="object-field"><span>Parent</span>
              <ResourceSelect
                value={data.parent}
                options={objectItems.filter((item) => item.id !== params.item.id)}
                project={project}
                placeholder="Search objects"
                onChange={(parent) => patch({ parent })}
              />
            </div>
            <div className="object-field"><span>Mask</span>
              <ResourceSelect value={data.mask} options={spriteItems} project={project} emptyLabel="Same as sprite" placeholder="Search sprites" onChange={(mask) => patch({ mask })} />
            </div>
          </section>

          <section className="object-card object-children">
            <h3>Children <span>{children.length}</span></h3>
            <div>{children.length ? children.map((item) => <span key={item.id}>{item.name}</span>) : <em>None</em>}</div>
          </section>
        </aside>

        <section className="object-events">
          <header><strong>Events</strong><span>{data.events.length}</span></header>
          <div className="object-event-list">
            {data.events.map((event, index) => {
              const Icon = eventIcon(event.type)
              return (
                <button
                  key={`${eventKey(event)}:${index}`}
                  className={index === eventPos ? 'selected' : ''}
                  onClick={() => { setEventPos(index); setActionPos(-1); setEditing(false) }}
                  onDoubleClick={() => openEventCode(event, index)}
                >
                  <span className={`object-event-icon type-${event.type}`}><Icon size={15} /></span>
                  <span>{eventName(event)}</span>
                  <small>{event.actions.length}</small>
                </button>
              )
            })}
            {data.events.length === 0 && <div className="object-list-empty"><Zap size={22} /><span>No events</span></div>}
          </div>
          <div className="object-event-buttons">
            <button className="primary" onClick={() => setPicker('add')}><Plus size={14} /> Add Event</button>
            <button onClick={() => setPicker('change')} disabled={!selectedEvent}>Change</button>
            <button onClick={deleteEvent} disabled={!selectedEvent}><Trash2 size={14} /> Delete</button>
          </div>
        </section>

        <section className="object-actions">
          <header>
            <div><strong>Actions</strong><span>{selectedEvent ? eventName(selectedEvent) : 'Select an event'}</span></div>
            <div className="object-action-tools">
              <button onClick={() => moveAction(-1)} disabled={actionPos <= 0} title="Move up"><ArrowUp size={14} /></button>
              <button onClick={() => moveAction(1)} disabled={!selectedEvent || actionPos < 0 || actionPos >= selectedEvent.actions.length - 1} title="Move down"><ArrowDown size={14} /></button>
              <button onClick={() => setEditing(true)} disabled={!selectedAction} title="Edit action"><Pencil size={14} /></button>
              <button onClick={deleteAction} disabled={!selectedAction} title="Delete action"><Trash2 size={14} /></button>
            </div>
          </header>
          <div
            className={`object-action-list ${dropActionPos !== null ? 'drag-over' : ''}`}
            onDragOver={dragOverActions}
            onDragLeave={leaveActions}
            onDrop={dropAction}
          >
            {selectedEvent?.actions.map((action, index) => {
              const info = actionMap.get(actionKey(action))
              return (
                <Fragment key={`${actionKey(action)}:${index}`}>
                  {dropActionPos === index && <div className="object-action-drop-line" />}
                  <button className={index === actionPos ? 'selected' : ''} onClick={() => setActionPos(index)} onDoubleClick={() => { setActionPos(index); setEditing(true) }}>
                    <span className="object-action-number">{index + 1}</span>
                    <span className="object-action-icon">{info?.icon ? <img src={info.icon} alt="" /> : <Braces size={17} />}</span>
                    <span className="object-action-text"><strong>{info?.name || (action.kind === 7 ? 'Execute Code' : `Action ${action.id}`)}</strong><small>{actionSummary(action, info)}</small></span>
                  </button>
                </Fragment>
              )
            })}
            {selectedEvent && dropActionPos === selectedEvent.actions.length && (
              <div className={`object-action-drop-line ${selectedEvent.actions.length === 0 ? 'empty' : ''}`}>
                {selectedEvent.actions.length === 0 && 'Drop action here'}
              </div>
            )}
            {!selectedEvent && <div className="object-list-empty"><Zap size={24} /><span>Select an event to edit its actions</span></div>}
            {selectedEvent && selectedEvent.actions.length === 0 && dropActionPos === null && <div className="object-list-empty"><Braces size={24} /><span>Choose or drag an action from the library</span></div>}
          </div>
        </section>

        <aside className="object-library">
          <header><strong>Action Library</strong><span>{activeLibrary?.actions.length ?? 0}</span></header>
          <nav>
            {libraries.map((item) => <button key={item.name} className={item.name === library ? 'active' : ''} onClick={() => setLibrary(item.name)}>{libraryName(item.name)}</button>)}
          </nav>
          <div className="object-library-actions">
            {activeLibrary?.actions.map((action) => (
              <button
                key={`${action.libraryId}:${action.id}`}
                className={draggedAction === actionKey(action) ? 'dragging' : ''}
                draggable={Boolean(selectedEvent)}
                onDragStart={(event) => startLibraryDrag(event, action)}
                onDragEnd={() => { setDraggedAction(''); setDropActionPos(null) }}
                onClick={() => addAction(action)}
                disabled={!selectedEvent}
                title={`${action.description || action.name}\nDrag or click to add`}
              >
                {action.icon ? <img src={action.icon} alt="" draggable={false} /> : <Braces size={19} />}
                <span>{action.description || action.name}</span>
              </button>
            ))}
            {!libraries.length && <div className="object-list-empty"><Clock3 size={22} /><span>{libraryError || 'Loading action libraries…'}</span></div>}
          </div>
        </aside>
      </div>

      {picker && <EventPicker title={picker === 'change' ? 'Change Event' : 'Choose the Event to Add'} objectItems={objectItems} onPick={pickEvent} onCancel={() => setPicker(null)} />}
      {editing && selectedAction && (
        <ActionEditor
          id={`${params.item.id}/${eventKey(selectedEvent)}/${actionPos}`}
          action={selectedAction}
          info={selectedInfo}
          project={project}
          onChange={(action) => changeAction(eventPos, actionPos, action)}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
