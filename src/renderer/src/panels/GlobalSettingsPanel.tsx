import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  Clipboard,
  FileImage,
  FolderCog,
  Gamepad2,
  Image as ImageIcon,
  Info,
  Layers3,
  Monitor,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
  Volume2
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  AudioGroupSettings,
  GlobalResourceRef,
  GlobalSettingsData,
  Project,
  ProjectItem,
  TextureGroupSettings,
  WindowsSettings
} from '../../../shared/types'
import { assetUrl } from '../assets'
import { ColorPicker } from '../ColorPicker'
import { EditorOk } from '../EditorOk'
import { useSave } from '../save'
import { useApp } from '../store'

type Page = 'general' | 'textures' | 'audio' | 'info' | 'windows'
type WindowsPage = 'general' | 'graphics' | 'installer'

const allTargets = '9223372036854775807'
const platforms = [
  ['Windows', '64'],
  ['Windows (YYC)', '1048576'],
  ['Mac OS X', '2'],
  ['Mac OS X (YYC)', '67108864'],
  ['Ubuntu (Linux)', '128'],
  ['Ubuntu (Linux) (YYC)', '134217728'],
  ['HTML5', '32'],
  ['Android', '8'],
  ['Android (YYC)', '2097152'],
  ['iOS', '4'],
  ['iOS (YYC)', '4194304']
] as const

const pages: Array<{ id: Page; name: string; icon: typeof Settings2 }> = [
  { id: 'general', name: 'General', icon: Settings2 },
  { id: 'textures', name: 'Texture Groups', icon: Layers3 },
  { id: 'audio', name: 'Audio Groups', icon: Volume2 },
  { id: 'info', name: 'Project Info', icon: Info },
  { id: 'windows', name: 'Windows', icon: Monitor }
]

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Global settings operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function copyData(value: GlobalSettingsData): GlobalSettingsData {
  return structuredClone(value)
}

function resourceItem(project: Project | null, ref: GlobalResourceRef | undefined): ProjectItem | undefined {
  if (!project || !ref) return undefined
  const target = ref
  let found: ProjectItem | undefined
  function visit(items: ProjectItem[]): void {
    for (const item of items) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === target.type && item.name === target.name) found = item
      if (found) return
    }
  }
  for (const group of project.groups) {
    if (group.type === target.type) visit(group.items)
    if (found) break
  }
  return found
}

function maskNumber(value: string): bigint {
  try {
    return value.startsWith('$') ? BigInt(`0x${value.slice(1)}`) : BigInt(value)
  } catch {
    return 0n
  }
}

function TargetList({
  value,
  onChange,
  disabled = false
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}): React.JSX.Element {
  const current = maskNumber(value)

  function toggle(bitText: string, enabled: boolean): void {
    const bit = BigInt(bitText)
    onChange((enabled ? current | bit : current & ~bit).toString())
  }

  return (
    <div className="global-targets">
      {platforms.map(([name, bit]) => (
        <label key={bit}>
          <input
            type="checkbox"
            disabled={disabled}
            checked={(current & BigInt(bit)) !== 0n}
            onChange={(event) => toggle(bit, event.target.checked)}
          />
          <span>{name}</span>
        </label>
      ))}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  children,
  disabled = false
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  children: React.ReactNode
  disabled?: boolean
}): React.JSX.Element {
  return (
    <label className="global-toggle">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{children}</span>
    </label>
  )
}

function Card({
  title,
  detail,
  children,
  className = ''
}: {
  title: string
  detail?: string
  children: React.ReactNode
  className?: string
}): React.JSX.Element {
  return (
    <section className={`global-card ${className}`}>
      <header><strong>{title}</strong>{detail && <small>{detail}</small>}</header>
      <div className="global-card-body">{children}</div>
    </section>
  )
}

function AssetPreview({
  path,
  project,
  version,
  label
}: {
  path: string
  project: Project | null
  version: number
  label: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const clean = path.replace(/\\/g, '/')
  useEffect(() => setFailed(false), [clean, project?.path, version])

  if (!project || !clean || clean.toLowerCase() === 'nil' || failed) {
    return <div className="global-asset-empty"><FileImage size={24} /><span>{label}</span></div>
  }
  return (
    <div className="global-asset-preview">
      <img
        src={assetUrl(clean, project.path, version)}
        alt={label}
        draggable={false}
        onError={() => setFailed(true)}
      />
    </div>
  )
}

function NumberInput({
  value,
  onChange,
  min = 0,
  max = 2147483647
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}): React.JSX.Element {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(event) => onChange(Number.parseInt(event.target.value, 10) || 0)}
    />
  )
}

function GeneralPage({
  data,
  patch
}: {
  data: GlobalSettingsData
  patch: (value: Partial<GlobalSettingsData['general']>) => void
}): React.JSX.Element {
  function generate(): void {
    const id = crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff
    patch({ gameId: id, guid: `{${crypto.randomUUID().toUpperCase()}}` })
  }

  return (
    <div className="global-page global-general-page">
      <Card title="Game Identity" detail="Identifier embedded in builds and save data">
        <div className="global-form identity-form">
          <label><span>Game Identifier</span><NumberInput value={data.general.gameId} onChange={(gameId) => patch({ gameId })} /></label>
          <label className="wide"><span>Game GUID</span><input value={data.general.guid} maxLength={38} onChange={(event) => patch({ guid: event.target.value })} /></label>
        </div>
        <div className="global-actions">
          <button onClick={generate}><RefreshCw size={14} /> Generate New ID and GUID</button>
          <button onClick={() => void navigator.clipboard.writeText(data.general.guid)}><Clipboard size={14} /> Copy GUID</button>
        </div>
      </Card>

      <Card title="Runtime" detail="Core compatibility options used by every target">
        <div className="global-check-grid">
          <Toggle checked={data.general.useNewAudio} onChange={(useNewAudio) => patch({ useNewAudio })}>Use New Audio Engine</Toggle>
          <Toggle checked={data.general.shortCircuit} onChange={(shortCircuit) => patch({ shortCircuit })}>Short-Circuit Evaluations</Toggle>
          <Toggle checked={data.general.fastCollision} onChange={(fastCollision) => patch({ fastCollision })}>Use Fast Collision System</Toggle>
          <Toggle checked={data.general.collisionCompatibility} onChange={(collisionCompatibility) => patch({ collisionCompatibility })}>Fast Collision Compatibility Mode</Toggle>
        </div>
      </Card>

      <Card title="Room Exterior" detail="Color shown outside the current room region">
        <div className="global-color-field"><ColorPicker value={data.general.windowColor} onChange={(windowColor) => patch({ windowColor })} label="Room exterior color" /></div>
      </Card>
    </div>
  )
}

function GroupContents({
  contents,
  selected,
  onSelect
}: {
  contents: GlobalResourceRef[]
  selected: number
  onSelect: (index: number) => void
}): React.JSX.Element {
  return (
    <div className="global-content-list" role="listbox">
      {contents.length === 0 && <div className="global-list-empty">This group is empty</div>}
      {contents.map((item, index) => (
        <button
          className={selected === index ? 'selected' : ''}
          role="option"
          aria-selected={selected === index}
          key={`${item.type}:${item.name}`}
          onClick={() => onSelect(index)}
        >
          {item.type === 'sound' ? <Volume2 size={14} /> : <ImageIcon size={14} />}
          <span>{item.name}</span><small>{item.type}</small>
        </button>
      ))}
    </div>
  )
}

function TexturePage({
  groups,
  setGroups,
  project,
  imageVersion
}: {
  groups: TextureGroupSettings[]
  setGroups: (groups: TextureGroupSettings[]) => void
  project: Project | null
  imageVersion: number
}): React.JSX.Element {
  const [selected, setSelected] = useState(0)
  const [content, setContent] = useState(0)
  const index = Math.min(selected, groups.length - 1)
  const group = groups[index]
  const ref = group?.contents[content]
  const item = resourceItem(project, ref)
  const image = item?.kind === 'resource' ? item.image : undefined

  useEffect(() => {
    if (selected >= groups.length) setSelected(Math.max(0, groups.length - 1))
  }, [groups.length, selected])

  function patch(value: Partial<TextureGroupSettings>): void {
    const next = groups.map((item, position) => position === index ? { ...item, ...value } : item)
    if (value.name !== undefined) {
      const oldName = group.name
      for (const item of next) if (item.parent === oldName) item.parent = value.name
    }
    setGroups(next)
  }

  function add(): void {
    let number = groups.length + 1
    const names = new Set(groups.map((item) => item.name.toLowerCase()))
    while (names.has(`texture group ${number}`.toLowerCase())) number += 1
    const next = [...groups, {
      sourceIndex: null,
      name: `Texture Group ${number}`,
      scaled: false,
      noCropping: false,
      border: 2,
      parent: '',
      targets: allTargets,
      contents: []
    }]
    setGroups(next)
    setSelected(next.length - 1)
    setContent(0)
  }

  function remove(): void {
    if (index === 0) return
    const removed = groups[index]
    const next = groups.filter((_item, position) => position !== index).map((item, position) => ({
      ...item,
      parent: item.parent === removed.name ? '' : item.parent,
      contents: position === 0 ? [...item.contents, ...removed.contents] : item.contents
    }))
    setGroups(next)
    setSelected(Math.min(index, next.length - 1))
    setContent(0)
  }

  return (
    <div className="global-groups-page">
      <section className="global-group-column">
        <header><strong>Texture Groups</strong><small>{groups.length} groups</small></header>
        <div className="global-group-list">
          {groups.map((item, position) => (
            <button className={index === position ? 'selected' : ''} key={`${item.sourceIndex}:${position}`} onClick={() => { setSelected(position); setContent(0) }}>
              <Layers3 size={15} /><span>{item.name}</span><small>{item.contents.length}</small>
            </button>
          ))}
        </div>
        <footer><button onClick={add}><Plus size={14} /> Add</button><button className="danger" disabled={index === 0} onClick={remove}><Trash2 size={14} /> Delete</button></footer>
      </section>

      <section className="global-group-column contents">
        <header><strong>Group Contents</strong><small>Sprites, backgrounds and fonts</small></header>
        <GroupContents contents={group.contents} selected={content} onSelect={setContent} />
      </section>

      <section className="global-group-settings">
        <header><strong>Texture Group Settings</strong><small>Configuration-specific packing options</small></header>
        <div className="global-group-preview">
          {image && project
            ? <img src={assetUrl(image, project.path, imageVersion)} alt={ref?.name ?? ''} draggable={false} />
            : <div><ImageIcon size={26} /><span>{ref ? 'No image preview' : 'Select a resource'}</span></div>}
        </div>
        <div className="global-form group-form">
          <label><span>Name</span><input value={group.name} disabled={index === 0} maxLength={80} onChange={(event) => patch({ name: event.target.value })} /></label>
          <label><span>Texture Border</span><select value={group.border} onChange={(event) => patch({ border: Number(event.target.value) })}>{[0, 1, 2, 4, 8, 16].map((value) => <option value={value} key={value}>{value} texels</option>)}</select></label>
          <label><span>Parent</span><select value={group.parent} onChange={(event) => patch({ parent: event.target.value })}><option value="">None</option>{groups.map((item, position) => position === index ? null : <option value={item.name} key={`${item.name}:${position}`}>{item.name}</option>)}</select></label>
        </div>
        <div className="global-check-grid compact">
          <Toggle checked={group.scaled} onChange={(scaled) => patch({ scaled })}>Texture group not scaled</Toggle>
          <Toggle checked={group.noCropping} onChange={(noCropping) => patch({ noCropping })}>No cropping</Toggle>
        </div>
        <div className="global-subtitle">Valid Targets</div>
        <TargetList value={group.targets} onChange={(targets) => patch({ targets })} />
      </section>
    </div>
  )
}

function AudioPage({
  groups,
  setGroups
}: {
  groups: AudioGroupSettings[]
  setGroups: (groups: AudioGroupSettings[]) => void
}): React.JSX.Element {
  const [selected, setSelected] = useState(0)
  const [content, setContent] = useState(0)
  const index = Math.min(selected, groups.length - 1)
  const group = groups[index]

  useEffect(() => {
    if (selected >= groups.length) setSelected(Math.max(0, groups.length - 1))
  }, [groups.length, selected])

  function patch(value: Partial<AudioGroupSettings>): void {
    setGroups(groups.map((item, position) => position === index ? { ...item, ...value } : item))
  }

  function add(): void {
    let number = groups.length
    const names = new Set(groups.map((item) => item.name.toLowerCase()))
    while (names.has(`audiogroup_${number}`)) number += 1
    const next = [...groups, {
      sourceIndex: null,
      name: `audiogroup_${number}`,
      targets: allTargets,
      contents: []
    }]
    setGroups(next)
    setSelected(next.length - 1)
    setContent(0)
  }

  function remove(): void {
    if (index === 0) return
    const removed = groups[index]
    const next = groups.filter((_item, position) => position !== index).map((item, position) => ({
      ...item,
      contents: position === 0 ? [...item.contents, ...removed.contents] : item.contents
    }))
    setGroups(next)
    setSelected(Math.min(index, next.length - 1))
    setContent(0)
  }

  return (
    <div className="global-groups-page audio">
      <section className="global-group-column">
        <header><strong>Audio Groups</strong><small>{groups.length} groups</small></header>
        <div className="global-group-list">
          {groups.map((item, position) => (
            <button className={index === position ? 'selected' : ''} key={`${item.sourceIndex}:${position}`} onClick={() => { setSelected(position); setContent(0) }}>
              <Volume2 size={15} /><span>{item.name}</span><small>{item.contents.length}</small>
            </button>
          ))}
        </div>
        <footer><button onClick={add}><Plus size={14} /> Add</button><button className="danger" disabled={index === 0} onClick={remove}><Trash2 size={14} /> Delete</button></footer>
      </section>
      <section className="global-group-column contents">
        <header><strong>Sound List</strong><small>Resources assigned to this group</small></header>
        <GroupContents contents={group.contents} selected={content} onSelect={setContent} />
      </section>
      <section className="global-group-settings audio-settings">
        <header><strong>Audio Group Settings</strong><small>Build targets for streamed and packaged audio</small></header>
        <div className="global-form group-form">
          <label><span>Name</span><input value={group.name} disabled={index === 0} maxLength={80} onChange={(event) => patch({ name: event.target.value })} /></label>
        </div>
        <div className="global-subtitle">Valid Targets</div>
        <TargetList value={group.targets} disabled={index === 0} onChange={(targets) => patch({ targets })} />
      </section>
    </div>
  )
}

function InfoPage({
  data,
  patch
}: {
  data: GlobalSettingsData
  patch: (value: Partial<GlobalSettingsData['projectInfo']>) => void
}): React.JSX.Element {
  return (
    <div className="global-page global-info-page">
      <Card title="Project Information" detail="Metadata stored in the selected configuration">
        <div className="global-form info-form">
          <label><span>Author</span><input value={data.projectInfo.author} onChange={(event) => patch({ author: event.target.value })} /></label>
          <label><span>Version</span><input value={data.projectInfo.version} onChange={(event) => patch({ version: event.target.value })} /></label>
          <label><span>Last Changed</span><input value={data.projectInfo.lastChanged || 'Updated when settings are saved'} disabled /></label>
          <label className="textarea"><span>Information</span><textarea value={data.projectInfo.information} onChange={(event) => patch({ information: event.target.value })} /></label>
        </div>
      </Card>
    </div>
  )
}

function WindowsGeneral({
  data,
  patch,
  project,
  imageVersion
}: {
  data: WindowsSettings
  patch: (value: Partial<WindowsSettings>) => void
  project: Project | null
  imageVersion: number
}): React.JSX.Element {
  function version(index: number, value: number): void {
    const next = [...data.version] as WindowsSettings['version']
    next[index] = value
    patch({ version: next })
  }
  return (
    <div className="windows-grid">
      <Card title="Application" detail="Executable identity and version information">
        <div className="global-form windows-form">
          <label className="wide"><span>Display Name</span><input value={data.displayName} onChange={(event) => patch({ displayName: event.target.value })} /></label>
          <label className="wide"><span>Version</span><div className="version-fields">{data.version.map((item, index) => <NumberInput key={index} value={item} max={65535} onChange={(value) => version(index, value)} />)}</div></label>
          <label><span>Company</span><input value={data.company} onChange={(event) => patch({ company: event.target.value })} /></label>
          <label><span>Product</span><input value={data.product} onChange={(event) => patch({ product: event.target.value })} /></label>
          <label><span>Copyright</span><input value={data.copyright} onChange={(event) => patch({ copyright: event.target.value })} /></label>
          <label><span>Description</span><input value={data.description} onChange={(event) => patch({ description: event.target.value })} /></label>
        </div>
      </Card>
      <Card title="Splash Screen" detail="Optional image shown while the runner starts">
        <AssetPreview path={data.splashScreen} project={project} version={imageVersion} label="No splash screen preview" />
        <label className="global-path-field"><span>File</span><input value={data.splashScreen} onChange={(event) => patch({ splashScreen: event.target.value })} /></label>
        <Toggle checked={data.useSplash} onChange={(useSplash) => patch({ useSplash })}>Display Splash Screen</Toggle>
      </Card>
      <Card title="Runtime Options" detail="Cursor, save folder and scheduler behavior">
        <div className="global-check-grid compact"><Toggle checked={data.showCursor} onChange={(showCursor) => patch({ showCursor })}>Display the cursor</Toggle></div>
        <div className="global-form runtime-form">
          <label><span>Game Icon</span><input value={data.gameIcon} onChange={(event) => patch({ gameIcon: event.target.value })} /></label>
          <label><span>Sleep Margin</span><NumberInput value={data.sleepMargin} max={1000} onChange={(sleepMargin) => patch({ sleepMargin })} /></label>
        </div>
        <div className="icon-line"><AssetPreview path={data.gameIcon} project={project} version={imageVersion} label="Game icon" /></div>
        <div className="global-radio-group"><strong>Save Data Location</strong><label><input type="radio" name="save-location" checked={data.saveLocation === 0} onChange={() => patch({ saveLocation: 0 })} /> %localappdata%\&lt;GameName&gt;</label><label><input type="radio" name="save-location" checked={data.saveLocation === 1} onChange={() => patch({ saveLocation: 1 })} /> %appdata%\&lt;GameName&gt;</label></div>
      </Card>
    </div>
  )
}

function WindowsGraphics({ data, patch }: { data: WindowsSettings; patch: (value: Partial<WindowsSettings>) => void }): React.JSX.Element {
  return (
    <div className="windows-grid graphics">
      <Card title="Window and Scaling" detail="Desktop display behavior">
        <div className="global-check-grid one">
          <Toggle checked={data.fullscreen} onChange={(fullscreen) => patch({ fullscreen })}>Start in fullscreen mode</Toggle>
          <Toggle checked={data.interpolate} onChange={(interpolate) => patch({ interpolate })}>Interpolate colors between pixels</Toggle>
          <Toggle checked={data.syncVertex} onChange={(syncVertex) => patch({ syncVertex })}>Use synchronization to avoid tearing</Toggle>
          <Toggle checked={data.sizable} onChange={(sizable) => patch({ sizable })}>Allow the player to resize the game window</Toggle>
          <Toggle checked={data.allowFullscreen} onChange={(allowFullscreen) => patch({ allowFullscreen })}>Allow switching to fullscreen</Toggle>
          <Toggle checked={data.borderless} onChange={(borderless) => patch({ borderless })}>Borderless Window</Toggle>
        </div>
        <div className="global-radio-group indent"><strong>Scaling</strong><label><input type="radio" name="scaling" checked={data.keepAspect} onChange={() => patch({ keepAspect: true })} /> Keep aspect ratio</label><label><input type="radio" name="scaling" checked={!data.keepAspect} onChange={() => patch({ keepAspect: false })} /> Full scale</label></div>
      </Card>
      <Card title="Texture Pages" detail="Maximum packed texture page size">
        <label className="global-select-field"><span>Size</span><select value={data.texturePage} onChange={(event) => patch({ texturePage: Number(event.target.value) })}>{[256, 512, 1024, 2048, 4096, 8192].map((value) => <option key={value} value={value}>{value} × {value}</option>)}</select></label>
      </Card>
      <Card title="Advanced" detail="Runner texture and vertex-buffer compatibility">
        <Toggle checked={data.createTexturesOnDemand} onChange={(createTexturesOnDemand) => patch({ createTexturesOnDemand })}>Create textures on demand</Toggle>
        <div className="global-radio-group"><strong>Vertex Buffer Method</strong>{['Fast', 'Compatible', 'Most compatible'].map((name, index) => <label key={name}><input type="radio" name="vertex-buffer" checked={data.vertexBufferMethod === index} onChange={() => patch({ vertexBufferMethod: index })} /> {name}</label>)}</div>
        <Toggle checked={data.alternateSyncMethod} onChange={(alternateSyncMethod) => patch({ alternateSyncMethod })}>Alternate synchronization method</Toggle>
      </Card>
    </div>
  )
}

function WindowsInstaller({
  data,
  patch,
  project,
  imageVersion
}: {
  data: WindowsSettings
  patch: (value: Partial<WindowsSettings>) => void
  project: Project | null
  imageVersion: number
}): React.JSX.Element {
  return (
    <div className="windows-grid installer">
      <Card title="Installer Graphics" detail="Images embedded in the Windows installer">
        <div className="installer-previews">
          <label><span>Finished</span><AssetPreview path={data.runnerFinished} project={project} version={imageVersion} label="Finished image" /><input value={data.runnerFinished} onChange={(event) => patch({ runnerFinished: event.target.value })} /></label>
          <label><span>Header</span><AssetPreview path={data.runnerHeader} project={project} version={imageVersion} label="Header image" /><input value={data.runnerHeader} onChange={(event) => patch({ runnerHeader: event.target.value })} /></label>
        </div>
      </Card>
      <Card title="Installer Files" detail="NSIS script and license document">
        <div className="global-form installer-files">
          <label><span>Installer NSIS Script</span><input value={data.installerScript} onChange={(event) => patch({ installerScript: event.target.value })} /></label>
          <label><span>License Agreement</span><input value={data.license} onChange={(event) => patch({ license: event.target.value })} /></label>
        </div>
      </Card>
    </div>
  )
}

function WindowsPage({
  data,
  patch,
  project,
  imageVersion
}: {
  data: WindowsSettings
  patch: (value: Partial<WindowsSettings>) => void
  project: Project | null
  imageVersion: number
}): React.JSX.Element {
  const [page, setPage] = useState<WindowsPage>('general')
  return (
    <div className="global-windows-page">
      <nav>{(['general', 'graphics', 'installer'] as WindowsPage[]).map((item) => <button className={page === item ? 'selected' : ''} key={item} onClick={() => setPage(item)}>{item === 'general' ? <Gamepad2 size={15} /> : item === 'graphics' ? <Monitor size={15} /> : <FolderCog size={15} />}<span>{item[0].toUpperCase() + item.slice(1)}</span></button>)}</nav>
      <div className="global-windows-content">
        {page === 'general' && <WindowsGeneral data={data} patch={patch} project={project} imageVersion={imageVersion} />}
        {page === 'graphics' && <WindowsGraphics data={data} patch={patch} />}
        {page === 'installer' && <WindowsInstaller data={data} patch={patch} project={project} imageVersion={imageVersion} />}
      </div>
    </div>
  )
}

export function GlobalSettingsPanel({ api }: IDockviewPanelProps): React.JSX.Element {
  const project = useApp((state) => state.project)
  const config = useApp((state) => state.config)
  const setProject = useApp((state) => state.setProject)
  const addLog = useApp((state) => state.addLog)
  const imageVersion = useApp((state) => state.imageVersion)
  const [page, setPage] = useState<Page>('general')
  const [data, setData] = useState<GlobalSettingsData | null>(null)
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const dirty = useMemo(() => data ? JSON.stringify(data) !== saved : false, [data, saved])
  useSave(api.id, dirty, save)

  useEffect(() => api.setTitle(`Global Game Settings${dirty ? ' •' : ''}`), [api, dirty])

  useEffect(() => {
    let canceled = false
    if (!project || !config) {
      setData(null)
      setSaved('')
      return
    }
    setLoading(true)
    setData(null)
    setSaved('')
    setMessage('')
    void window.openGms.readGlobalSettings(config).then((value) => {
      if (canceled) return
      const next = copyData(value)
      setData(next)
      setSaved(JSON.stringify(next))
    }).catch((error) => {
      if (!canceled) setMessage(errorText(error))
    }).finally(() => {
      if (!canceled) setLoading(false)
    })
    return () => { canceled = true }
  }, [config, project?.path])

  async function save(): Promise<void> {
    if (!data || !dirty || saving || !config) return
    const snapshot = copyData(data)
    const snapshotValue = JSON.stringify(snapshot)
    setSaving(true)
    try {
      const nextProject = await window.openGms.saveGlobalSettings(config, snapshot)
      setProject(nextProject)
      const fresh = copyData(await window.openGms.readGlobalSettings(config))
      setData((current) => current && JSON.stringify(current) === snapshotValue ? fresh : current)
      setSaved(JSON.stringify(fresh))
      addLog(`Saved global game settings for ${config}.`)
    } catch (error) {
      addLog(`Failed to save global game settings for ${config}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  if (!project) return <div className="global-settings-empty">Open a project to edit global settings.</div>
  if (!data) return <div className="global-settings-empty">{loading ? 'Reading global settings…' : (message || 'Global settings are unavailable.')}</div>

  function update(next: (value: GlobalSettingsData) => void): void {
    setData((current) => {
      if (!current) return current
      const copy = copyData(current)
      next(copy)
      return copy
    })
    setMessage('')
  }

  return (
    <section className="global-settings-editor">
      <header className="global-settings-head">
        <div className="global-settings-title"><span><Settings2 size={18} /></span><div><strong>Global Game Settings</strong><small>Configuration: {config}</small></div></div>
        <EditorOk api={api} />
      </header>
      <nav className="global-settings-tabs">
        {pages.map((item) => {
          const Icon = item.icon
          return <button className={page === item.id ? 'selected' : ''} key={item.id} onClick={() => setPage(item.id)}><Icon size={15} /><span>{item.name}</span></button>
        })}
      </nav>
      <main className="global-settings-body">
        {page === 'general' && <GeneralPage data={data} patch={(value) => update((next) => Object.assign(next.general, value))} />}
        {page === 'textures' && <TexturePage groups={data.textureGroups} setGroups={(textureGroups) => update((next) => { next.textureGroups = textureGroups })} project={project} imageVersion={imageVersion} />}
        {page === 'audio' && <AudioPage groups={data.audioGroups} setGroups={(audioGroups) => update((next) => { next.audioGroups = audioGroups })} />}
        {page === 'info' && <InfoPage data={data} patch={(value) => update((next) => Object.assign(next.projectInfo, value))} />}
        {page === 'windows' && <WindowsPage data={data.windows} patch={(value) => update((next) => Object.assign(next.windows, value))} project={project} imageVersion={imageVersion} />}
      </main>
      <footer className="global-settings-footer"><span><Check size={13} /> Settings are stored in Configs/{config}.config.gmx</span></footer>
    </section>
  )
}
