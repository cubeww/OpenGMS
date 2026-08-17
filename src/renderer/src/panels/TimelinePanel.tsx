import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Braces,
  Check,
  Clock3,
  Copy,
  GitMerge,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  ActionInfo,
  ActionLibrary,
  ObjectAction,
  ProjectItem,
  TimelineData,
  TimelineMoment
} from '../../../shared/types'
import { requestCodeReveal } from '../codeReveal'
import { listenSearchReveal } from '../codeSearch'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'
import {
  ActionEditor,
  actionKey,
  actionSummary,
  isCodeAction,
  libraryName,
  loadActions,
  makeAction,
  makeCodeAction,
  setArg
} from './ObjectPanel'

type TimelineItem = Extract<ProjectItem, { kind: 'resource' }>
type DialogKind = 'add' | 'change' | 'delete' | 'shift' | 'duplicate' | 'spread' | 'merge'
type DialogValues = { from: number; till: number; to: number; percentage: number }

export type TimelineParams = {
  item: TimelineItem
}

const dialogTitles: Record<DialogKind, string> = {
  add: 'Adding a Moment',
  change: 'Changing a Moment',
  delete: 'Delete Moments',
  shift: 'Shift Moments',
  duplicate: 'Duplicate Moments',
  spread: 'Spread Moments',
  merge: 'Merging Moments'
}

function copyAction(action: ObjectAction): ObjectAction {
  return { ...action, args: action.args.map((arg) => ({ ...arg })) }
}

function normalize(moments: TimelineMoment[]): TimelineMoment[] {
  const result: TimelineMoment[] = []
  for (const moment of [...moments].sort((left, right) => left.step - right.step)) {
    const actions = moment.actions.map(copyAction)
    const last = result[result.length - 1]
    if (last?.step === moment.step) last.actions.push(...actions)
    else result.push({ step: moment.step, actions })
  }
  return result
}

function copyTimeline(timeline: TimelineData): TimelineData {
  return { moments: normalize(timeline.moments) }
}

function validStep(value: number): boolean {
  return Number.isSafeInteger(value) && value >= -0x80000000 && value <= 0x7fffffff
}

function roundStep(value: number): number {
  const floor = Math.floor(value)
  const part = value - floor
  if (part < 0.5) return floor
  if (part > 0.5) return floor + 1
  return floor % 2 === 0 ? floor : floor + 1
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function MomentDialog({
  kind,
  initial,
  onApply,
  onClose
}: {
  kind: DialogKind
  initial: DialogValues
  onApply: (values: DialogValues) => string | undefined
  onClose: () => void
}): React.JSX.Element {
  const [values, setValues] = useState(() => ({
    from: String(initial.from),
    till: String(initial.till),
    to: String(initial.to),
    percentage: String(initial.percentage)
  }))
  const [error, setError] = useState('')

  useEffect(() => {
    function close(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  function submit(event: React.FormEvent): void {
    event.preventDefault()
    if (Object.values(values).some((value) => value.trim() === '')) {
      setError('Enter a value for every field.')
      return
    }
    const parsed: DialogValues = {
      from: Number(values.from),
      till: Number(values.till),
      to: Number(values.to),
      percentage: Number(values.percentage)
    }
    if (Object.values(parsed).some((value) => !Number.isSafeInteger(value))) {
      setError('Enter whole numbers for every field.')
      return
    }
    const message = onApply(parsed)
    if (message) setError(message)
    else onClose()
  }

  function field(name: keyof typeof values, label: string, autoFocus = false): React.JSX.Element {
    return (
      <label>
        <span>{label}</span>
        <input
          autoFocus={autoFocus}
          type="number"
          value={values[name]}
          onChange={(event) => setValues((current) => ({ ...current, [name]: event.target.value }))}
        />
      </label>
    )
  }

  return (
    <div className="object-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="timeline-dialog" role="dialog" aria-modal="true" aria-label={dialogTitles[kind]} onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header><strong>{dialogTitles[kind]}</strong><button type="button" onClick={onClose} title="Close"><X size={16} /></button></header>
        <div className="timeline-dialog-fields">
          {kind === 'add' && field('from', 'Indicate the moment', true)}
          {kind === 'change' && field('from', 'Indicate new moment', true)}
          {(kind === 'delete' || kind === 'shift' || kind === 'duplicate' || kind === 'spread' || kind === 'merge') && field('from', 'From moment', true)}
          {(kind === 'delete' || kind === 'shift' || kind === 'duplicate' || kind === 'spread' || kind === 'merge') && field('till', 'Till moment')}
          {(kind === 'shift' || kind === 'duplicate') && field('to', 'To moment')}
          {kind === 'spread' && field('percentage', 'Percentage')}
          {error && <span className="timeline-dialog-error">{error}</span>}
        </div>
        <footer>
          <button type="button" onClick={onClose}><X size={14} /> Cancel</button>
          <button className="primary" type="submit"><Check size={14} /> OK</button>
        </footer>
      </form>
    </div>
  )
}

function ConfirmDialog({
  title,
  text,
  onConfirm,
  onClose
}: {
  title: string
  text: string
  onConfirm: () => void
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
    <div className="object-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="timeline-dialog confirm" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header><strong>{title}</strong><button onClick={onClose} title="Close"><X size={16} /></button></header>
        <div className="timeline-confirm-text">{text}</div>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button className="danger" onClick={() => { onConfirm(); onClose() }}><Trash2 size={14} /> Remove</button>
        </footer>
      </section>
    </div>
  )
}

export function TimelinePanel({ params, api }: IDockviewPanelProps<TimelineParams>): React.JSX.Element {
  const source = params.item.timeline
  const [timeline, setTimeline] = useState<TimelineData | null>(() => source ? copyTimeline(source) : null)
  const [saved, setSaved] = useState(() => source ? JSON.stringify(copyTimeline(source)) : '')
  const [momentPos, setMomentPos] = useState(source?.moments.length ? 0 : -1)
  const [actionPos, setActionPos] = useState(-1)
  const [dialog, setDialog] = useState<DialogKind | null>(null)
  const [confirm, setConfirm] = useState<'clear' | null>(null)
  const [editing, setEditing] = useState(false)
  const [libraries, setLibraries] = useState<ActionLibrary[]>([])
  const [library, setLibrary] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const [saving, setSaving] = useState(false)
  const project = useApp((state) => state.project)
  const updateTimeline = useApp((state) => state.updateTimeline)
  const addLog = useApp((state) => state.addLog)
  const dirty = timeline ? JSON.stringify(timeline) !== saved : false
  useSave(api.id, dirty, save)
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
    if (!timeline?.moments.length) {
      setMomentPos(-1)
      setActionPos(-1)
      setEditing(false)
      return
    }
    if (momentPos >= timeline.moments.length) setMomentPos(timeline.moments.length - 1)
  }, [momentPos, timeline])

  useEffect(() => listenSearchReveal(params.item.id, (result) => {
    if (result.kind !== 'timeline' || !timeline || result.actionIndex === undefined) return
    const nextMoment = result.momentStep === undefined
      ? result.momentIndex ?? -1
      : timeline.moments.findIndex((moment) => moment.step === result.momentStep)
    const moment = timeline.moments[nextMoment]
    if (!moment?.actions[result.actionIndex]) return
    setMomentPos(nextMoment)
    setActionPos(result.actionIndex)
    setEditing(true)
    if (result.codeEditor) {
      requestCodeReveal({
        id: `${params.item.id}/${moment.step}/${result.actionIndex}`,
        line: result.line,
        column: result.column,
        length: result.length
      })
    }
  }), [params.item.id, timeline])

  if (!timeline) {
    return (
      <div className="object-empty">
        <Clock3 size={34} />
        <strong>Timeline data is unavailable</strong>
        <span>The timeline descriptor is missing or could not be parsed.</span>
      </div>
    )
  }

  const data = timeline
  const selectedMoment = data.moments[momentPos]
  const selectedAction = selectedMoment?.actions[actionPos]
  const selectedInfo = selectedAction ? actionMap.get(actionKey(selectedAction)) : undefined
  const activeLibrary = libraries.find((item) => item.name === library)
  const selectedStep = selectedMoment?.step ?? 0
  const dialogInitial: DialogValues = {
    from: dialog === 'add' ? (selectedMoment ? selectedStep + 1 : 0) : selectedStep,
    till: selectedStep,
    to: selectedStep + 1,
    percentage: 100
  }

  function setMoments(moments: TimelineMoment[], stepToSelect?: number): void {
    const next = normalize(moments)
    setTimeline({ moments: next })
    const position = stepToSelect === undefined ? Math.min(momentPos, next.length - 1) : next.findIndex((moment) => moment.step === stepToSelect)
    setMomentPos(position >= 0 ? position : Math.min(momentPos, next.length - 1))
    setActionPos(-1)
    setEditing(false)
  }

  function changeActions(actions: ObjectAction[]): void {
    if (!selectedMoment) return
    setTimeline({
      moments: data.moments.map((moment, index) => index === momentPos
        ? { ...moment, actions: actions.map(copyAction) }
        : moment)
    })
  }

  function changeAction(index: number, action: ObjectAction): void {
    if (!selectedMoment) return
    changeActions(selectedMoment.actions.map((item, position) => position === index ? action : item))
  }

  async function save(): Promise<void> {
    if (!timeline || saving) return
    const snapshot = copyTimeline(timeline)
    const savedValue = JSON.stringify(snapshot)
    if (savedValue === saved) return
    setSaving(true)
    try {
      await window.openGms.saveTimeline(params.item.file, snapshot)
      updateTimeline(params.item.id, snapshot)
      setSaved(savedValue)
      addLog(`Saved timeline ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save timeline ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  function applyDialog(values: DialogValues): string | undefined {
    const { from, till, to, percentage } = values
    const momentValues = dialog === 'add' || dialog === 'change'
      ? [from]
      : dialog === 'shift' || dialog === 'duplicate'
        ? [from, till, to]
        : [from, till]
    if (!momentValues.every(validStep)) return 'Moment values are outside the supported range.'
    if (from > till && dialog !== 'add' && dialog !== 'change') return 'From moment must not exceed till moment.'

    if (dialog === 'add') {
      const found = data.moments.findIndex((moment) => moment.step === from)
      if (found >= 0) {
        setMomentPos(found)
        return 'Moment already exists.'
      }
      setMoments([...data.moments, { step: from, actions: [] }], from)
      return
    }

    if (dialog === 'change') {
      if (!selectedMoment) return 'Select a moment first.'
      if (from !== selectedMoment.step && data.moments.some((moment) => moment.step === from)) {
        return 'Moment already exists.'
      }
      setMoments(data.moments.map((moment, index) => index === momentPos ? { ...moment, step: from } : moment), from)
      return
    }

    if (dialog === 'delete') {
      if (!data.moments.some((moment) => moment.step >= from && moment.step <= till)) {
        return 'The selected range contains no moments.'
      }
      setMoments(data.moments.filter((moment) => moment.step < from || moment.step > till))
      return
    }

    const chosen = data.moments.filter((moment) => moment.step >= from && moment.step <= till)
    if (!chosen.length && dialog !== 'merge') return 'The selected range contains no moments.'

    if (dialog === 'shift') {
      const moved = data.moments.map((moment) => moment.step >= from && moment.step <= till
        ? { ...moment, step: to + moment.step - from }
        : moment)
      if (moved.some((moment) => !validStep(moment.step))) return 'Shifted moments exceed the supported range.'
      setMoments(moved, to + chosen[0].step - from)
      return
    }

    if (dialog === 'duplicate') {
      const copies = chosen.map((moment) => ({ ...moment, step: to + moment.step - from }))
      if (copies.some((moment) => !validStep(moment.step))) return 'Duplicated moments exceed the supported range.'
      setMoments([...data.moments, ...copies], copies[0].step)
      return
    }

    if (dialog === 'spread') {
      if (percentage < 0 || percentage > 1000000) return 'Percentage must be between 0 and 1,000,000.'
      const spread = data.moments.map((moment) => moment.step >= from && moment.step <= till
        ? { ...moment, step: from + roundStep((moment.step - from) * percentage / 100) }
        : moment)
      if (spread.some((moment) => !validStep(moment.step))) return 'Spread moments exceed the supported range.'
      setMoments(spread, from + roundStep((chosen[0].step - from) * percentage / 100))
      return
    }

    if (dialog === 'merge') {
      const actions = chosen.flatMap((moment) => moment.actions.map(copyAction))
      const rest = data.moments.filter((moment) => moment.step < from || moment.step > till)
      setMoments([...rest, { step: from, actions }], from)
    }
  }

  function clearMoments(): void {
    setMoments([])
  }

  function addAction(info: ActionInfo): void {
    if (!selectedMoment) return
    const action = makeAction(info)
    const index = selectedMoment.actions.length
    changeActions([...selectedMoment.actions, action])
    setActionPos(index)
    setEditing(info.args.length > 0 || info.interfaceKind === 5)
  }

  function openMomentCode(moment: TimelineMoment, index: number): void {
    const codeIndex = moment.actions.findIndex((action) => (
      isCodeAction(action, actionMap.get(actionKey(action)))
    ))
    setMomentPos(index)
    if (codeIndex >= 0) {
      setActionPos(codeIndex)
      setEditing(true)
      return
    }

    const info = actionMap.get('1:603') ?? libraries
      .flatMap((item) => item.actions)
      .find((action) => action.interfaceKind === 5 || action.kind === 7)
    const action = makeCodeAction(info)
    setTimeline({
      moments: data.moments.map((item, position) => position === index
        ? { ...item, actions: [...item.actions, action] }
        : item)
    })
    setActionPos(moment.actions.length)
    setEditing(true)
  }

  function deleteAction(): void {
    if (!selectedMoment || actionPos < 0) return
    changeActions(selectedMoment.actions.filter((_action, index) => index !== actionPos))
    setActionPos(Math.min(actionPos, selectedMoment.actions.length - 2))
    setEditing(false)
  }

  function moveAction(amount: number): void {
    if (!selectedMoment || actionPos < 0) return
    const target = actionPos + amount
    if (target < 0 || target >= selectedMoment.actions.length) return
    const actions = selectedMoment.actions.map(copyAction)
    ;[actions[actionPos], actions[target]] = [actions[target], actions[actionPos]]
    changeActions(actions)
    setActionPos(target)
  }

  return (
    <section className="object-editor timeline-editor">
      <header className="object-editor-head">
        <div className="sprite-title object-title timeline-title">
          <span className="sprite-title-icon"><Clock3 size={18} /></span>
          <div><strong>{params.item.name}</strong><small>Timeline resource</small></div>
        </div>
        <EditorOk api={api} />
      </header>

      <div className="object-editor-body timeline-editor-body">
        <aside className="object-settings timeline-settings">
          <section className="object-card timeline-name-card">
            <label className="object-field"><span>Name</span><ResourceName item={params.item} /></label>
          </section>
          <div className="timeline-tools">
            <button className="primary" onClick={() => setDialog('add')}><Plus size={15} /> Add</button>
            <button onClick={() => setDialog('change')} disabled={!selectedMoment}><RefreshCw size={14} /> Change</button>
            <button onClick={() => setDialog('delete')} disabled={!data.moments.length}><Trash2 size={14} /> Delete</button>
            <button onClick={() => setConfirm('clear')} disabled={!data.moments.length}><X size={14} /> Clear</button>
            <button onClick={() => setDialog('shift')} disabled={!data.moments.length}><ArrowRight size={14} /> Shift</button>
            <button onClick={() => setDialog('duplicate')} disabled={!data.moments.length}><Copy size={14} /> Duplicate</button>
            <button onClick={() => setDialog('spread')} disabled={!data.moments.length}><RefreshCw size={14} /> Spread</button>
            <button onClick={() => setDialog('merge')} disabled={!data.moments.length}><GitMerge size={14} /> Merge</button>
          </div>
        </aside>

        <section className="object-events timeline-moments">
          <header><strong>Moments</strong><span>{data.moments.length}</span></header>
          <div className="object-event-list timeline-moment-list">
            {data.moments.map((moment, index) => (
              <button
                key={`${moment.step}:${index}`}
                className={index === momentPos ? 'selected' : ''}
                onClick={() => { setMomentPos(index); setActionPos(-1); setEditing(false) }}
                onDoubleClick={() => openMomentCode(moment, index)}
              >
                <span className="object-event-icon"><Clock3 size={14} /></span>
                <span>Step {moment.step}</span>
                <small>{moment.actions.length}</small>
              </button>
            ))}
            {!data.moments.length && <div className="object-list-empty"><Clock3 size={22} /><span>No moments</span></div>}
          </div>
        </section>

        <section className="object-actions">
          <header>
            <div><strong>Actions</strong><span>{selectedMoment ? `Step ${selectedMoment.step}` : 'Select a moment'}</span></div>
            <div className="object-action-tools">
              <button onClick={() => moveAction(-1)} disabled={actionPos <= 0} title="Move up"><ArrowUp size={14} /></button>
              <button onClick={() => moveAction(1)} disabled={!selectedMoment || actionPos < 0 || actionPos >= selectedMoment.actions.length - 1} title="Move down"><ArrowDown size={14} /></button>
              <button onClick={() => setEditing(true)} disabled={!selectedAction} title="Edit action"><Pencil size={14} /></button>
              <button onClick={deleteAction} disabled={!selectedAction} title="Delete action"><Trash2 size={14} /></button>
            </div>
          </header>
          <div className="object-action-list">
            {selectedMoment?.actions.map((action, index) => {
              const info = actionMap.get(actionKey(action))
              return (
                <button key={`${actionKey(action)}:${index}`} className={index === actionPos ? 'selected' : ''} onClick={() => setActionPos(index)} onDoubleClick={() => { setActionPos(index); setEditing(true) }}>
                  <span className="object-action-number">{index + 1}</span>
                  <span className="object-action-icon">{info?.icon ? <img src={info.icon} alt="" /> : <Braces size={17} />}</span>
                  <span className="object-action-text"><strong>{info?.name || (action.kind === 7 ? 'Execute Code' : `Action ${action.id}`)}</strong><small>{actionSummary(action, info)}</small></span>
                </button>
              )
            })}
            {!selectedMoment && <div className="object-list-empty"><Clock3 size={24} /><span>Select a moment to edit its actions</span></div>}
            {selectedMoment && !selectedMoment.actions.length && <div className="object-list-empty"><Braces size={24} /><span>Choose an action from the library</span></div>}
          </div>
        </section>

        <aside className="object-library">
          <header><strong>Action Library</strong><span>{activeLibrary?.actions.length ?? 0}</span></header>
          <nav>
            {libraries.map((item) => <button key={item.name} className={item.name === library ? 'active' : ''} onClick={() => setLibrary(item.name)}>{libraryName(item.name)}</button>)}
          </nav>
          <div className="object-library-actions">
            {activeLibrary?.actions.map((action) => (
              <button key={`${action.libraryId}:${action.id}`} onClick={() => addAction(action)} disabled={!selectedMoment} title={action.description}>
                {action.icon ? <img src={action.icon} alt="" /> : <Braces size={19} />}
                <span>{action.description || action.name}</span>
              </button>
            ))}
            {!libraries.length && <div className="object-list-empty"><Clock3 size={22} /><span>{libraryError || 'Loading action libraries…'}</span></div>}
          </div>
        </aside>
      </div>

      {dialog && <MomentDialog kind={dialog} initial={dialogInitial} onApply={applyDialog} onClose={() => setDialog(null)} />}
      {confirm === 'clear' && <ConfirmDialog title="Clear Timeline" text={`Remove all ${data.moments.length} moments from this timeline?`} onConfirm={clearMoments} onClose={() => setConfirm(null)} />}
      {editing && selectedAction && selectedMoment && (
        <ActionEditor
          id={`${params.item.id}/${selectedMoment.step}/${actionPos}`}
          action={selectedAction}
          info={selectedInfo}
          project={project}
          onChange={(action) => changeAction(actionPos, action)}
          onClose={() => setEditing(false)}
        />
      )}
    </section>
  )
}
