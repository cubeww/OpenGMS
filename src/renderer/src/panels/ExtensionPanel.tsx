import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  ChevronRight,
  Code2,
  Globe2,
  Monitor,
  Package,
  Plus,
  Puzzle,
  Settings2,
  Smartphone,
  Terminal,
  Trash2,
  type LucideIcon
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  ExtensionData,
  ExtensionFramework,
  ExtensionResource,
  Project,
  ProjectItem,
  ResourceType
} from '../../../shared/types'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'

type ExtensionItem = Extract<ProjectItem, { kind: 'resource' }>
type ProjectResource = Extract<ProjectItem, { kind: 'resource' }>
type Page = 'general' | 'ios' | 'android' | 'export' | 'import'

export type ExtensionParams = {
  item: ExtensionItem
}

const tabs: Array<{ id: Page; name: string; icon: LucideIcon }> = [
  { id: 'general', name: 'General', icon: Settings2 },
  { id: 'ios', name: 'iOS', icon: Smartphone },
  { id: 'android', name: 'Android', icon: Smartphone },
  { id: 'export', name: 'Export Resources', icon: ArrowRight },
  { id: 'import', name: 'Import Resources', icon: ArrowLeft }
]

const platforms: Array<{ name: string; value: string; note: string; icon: LucideIcon }> = [
  { name: 'Windows', value: '64', note: 'VM runner', icon: Monitor },
  { name: 'Windows (YYC)', value: '1048576', note: 'Native compiler', icon: Monitor },
  { name: 'Mac OS X', value: '2', note: 'VM runner', icon: Monitor },
  { name: 'Mac OS X (YYC)', value: '67108864', note: 'Native compiler', icon: Monitor },
  { name: 'Ubuntu (Linux)', value: '128', note: 'VM runner', icon: Terminal },
  { name: 'Ubuntu (Linux) (YYC)', value: '134217728', note: 'Native compiler', icon: Terminal },
  { name: 'HTML5', value: '32', note: 'Browser runner', icon: Globe2 },
  { name: 'Android', value: '8', note: 'VM runner', icon: Smartphone },
  { name: 'Android (YYC)', value: '2097152', note: 'Native compiler', icon: Smartphone },
  { name: 'iOS', value: '4', note: 'VM runner', icon: Smartphone },
  { name: 'iOS (YYC)', value: '4194304', note: 'Native compiler', icon: Smartphone }
]

const transferTypes = new Set<ResourceType>([
  'sprite', 'sound', 'background', 'path', 'script', 'shader', 'font',
  'timeline', 'object', 'room', 'file'
])

const typeNames: Record<ResourceType, string> = {
  sprite: 'Sprite',
  sound: 'Sound',
  background: 'Background',
  path: 'Path',
  script: 'Script',
  shader: 'Shader',
  font: 'Font',
  timeline: 'Time Line',
  object: 'Object',
  room: 'Room',
  file: 'Included File',
  extension: 'Extension',
  macro: 'Macro'
}

function copyExtension(value: ExtensionData): ExtensionData {
  return {
    ...value,
    version: [...value.version] as [number, number, number],
    copyMasks: { ...value.copyMasks },
    systemFrameworks: value.systemFrameworks.map((item) => ({ ...item })),
    thirdPartyFrameworks: value.thirdPartyFrameworks.map((item) => ({ ...item })),
    permissions: [...value.permissions],
    includedResources: value.includedResources.map((item) => ({ ...item })),
    files: value.files.map((file) => ({
      ...file,
      copyMasks: { ...file.copyMasks },
      proxyFiles: file.proxyFiles.map((proxy) => ({ ...proxy })),
      functions: file.functions.map((fn) => ({ ...fn, args: [...fn.args] }))
    }))
  }
}

function currentExtension(id: string): ExtensionData | undefined {
  const project = useApp.getState().project
  if (!project) return undefined
  const visit = (items: ProjectItem[]): ExtensionData | undefined => {
    for (const item of items) {
      if (item.kind === 'group') {
        const found = visit(item.items)
        if (found) return found
      } else if (item.id === id) {
        return item.extension
      }
    }
    return undefined
  }
  for (const group of project.groups) {
    const found = visit(group.items)
    if (found) return found
  }
  return undefined
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function TextField({
  label,
  value,
  placeholder,
  onChange
}: {
  label: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <label className="extension-field">
      <span>{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function CodeField({
  label,
  value,
  rows = 7,
  placeholder,
  onChange
}: {
  label: string
  value: string
  rows?: number
  placeholder?: string
  onChange: (value: string) => void
}): React.JSX.Element {
  return (
    <label className="extension-code-field">
      <span>{label}</span>
      <textarea
        value={value}
        rows={rows}
        spellCheck={false}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

function Card({
  title,
  detail,
  icon: Icon,
  className,
  children
}: {
  title: string
  detail?: string
  icon: LucideIcon
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={`extension-card ${className ?? ''}`}>
      <header>
        <span><Icon size={16} /></span>
        <div><strong>{title}</strong>{detail && <small>{detail}</small>}</div>
      </header>
      <div className="extension-card-body">{children}</div>
    </section>
  )
}

function FrameworkEditor({
  values,
  onChange
}: {
  values: ExtensionFramework[]
  onChange: (values: ExtensionFramework[]) => void
}): React.JSX.Element {
  function add(): void {
    onChange([...values, { name: 'Framework.framework', weak: false, tag: 'framework' }])
  }

  function patch(index: number, valuesToSet: Partial<ExtensionFramework>): void {
    onChange(values.map((item, position) => position === index ? { ...item, ...valuesToSet } : item))
  }

  return (
    <div className="extension-list-editor">
      <div className="extension-list">
        {values.map((item, index) => (
          <div className="extension-list-row framework" key={`${item.tag}:${index}`}>
            <input
              value={item.name}
              aria-label="Framework name"
              onChange={(event) => patch(index, { name: event.target.value })}
            />
            <label title="Weak reference">
              <input
                type="checkbox"
                checked={item.weak}
                onChange={(event) => patch(index, { weak: event.target.checked })}
              />
              Weak
            </label>
            <button
              className="icon danger"
              title="Remove framework"
              onClick={() => onChange(values.filter((_item, position) => position !== index))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {values.length === 0 && <div className="extension-list-empty">No frameworks added</div>}
      </div>
      <button onClick={add}><Plus size={14} /> Add Framework</button>
    </div>
  )
}

function PermissionEditor({
  values,
  onChange
}: {
  values: string[]
  onChange: (values: string[]) => void
}): React.JSX.Element {
  return (
    <div className="extension-list-editor">
      <div className="extension-list">
        {values.map((item, index) => (
          <div className="extension-list-row" key={index}>
            <input
              value={item}
              aria-label="Android permission"
              onChange={(event) => onChange(values.map((value, position) =>
                position === index ? event.target.value : value
              ))}
            />
            <button
              className="icon danger"
              title="Remove permission"
              onClick={() => onChange(values.filter((_value, position) => position !== index))}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {values.length === 0 && <div className="extension-list-empty">No permissions added</div>}
      </div>
      <button onClick={() => onChange([...values, 'android.permission.'])}>
        <Plus size={14} /> Add Permission
      </button>
    </div>
  )
}

function projectResources(project: Project | null): ProjectResource[] {
  const result: ProjectResource[] = []
  function visit(items: ProjectItem[]): void {
    for (const item of items) {
      if (item.kind === 'group') visit(item.items)
      else if (transferTypes.has(item.type)) result.push(item)
    }
  }
  if (project) for (const group of project.groups) visit(group.items)
  return result
}

function refKey(value: { type: ResourceType; path: string }): string {
  return `${value.type}:${value.path.replace(/\\/g, '/').toLowerCase()}`
}

function ProjectTree({
  project,
  selected,
  onSelect
}: {
  project: Project | null
  selected: string
  onSelect: (id: string) => void
}): React.JSX.Element {
  const groups = (project?.groups ?? []).filter((group) => transferTypes.has(group.type))
  const [open, setOpen] = useState<Set<ResourceType>>(new Set())

  return (
    <div className="extension-resource-tree" role="tree">
      {groups.map((group) => {
        const resources = projectResources(project).filter((item) => item.type === group.type)
        const expanded = open.has(group.type)
        return (
          <div key={group.type}>
            <button
              className="extension-resource-root"
              onClick={() => setOpen((current) => {
                const next = new Set(current)
                if (next.has(group.type)) next.delete(group.type)
                else next.add(group.type)
                return next
              })}
            >
              <ChevronRight className={expanded ? 'open' : ''} size={14} />
              <Boxes size={14} />
              <span>{group.name}</span>
              <small>{resources.length}</small>
            </button>
            {expanded && resources.map((item) => (
              <button
                className={`extension-resource-row ${selected === item.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => onSelect(item.id)}
              >
                <span>{item.name}</span>
                <small>{item.missing ? 'Missing' : typeNames[item.type]}</small>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function IncludedList({
  values,
  selected,
  projectItems,
  onSelect
}: {
  values: ExtensionResource[]
  selected: number
  projectItems: ProjectResource[]
  onSelect: (index: number) => void
}): React.JSX.Element {
  const projectKeys = new Set(projectItems.map(refKey))
  return (
    <div className="extension-included-list">
      {values.map((item, index) => {
        const name = item.path.replace(/\\/g, '/').split('/').pop() || item.path
        return (
          <button
            className={selected === index ? 'selected' : ''}
            key={`${refKey(item)}:${index}`}
            onClick={() => onSelect(index)}
          >
            <Puzzle size={14} />
            <span><strong>{name}</strong><small>{item.path}</small></span>
            <em className={projectKeys.has(refKey(item)) ? 'available' : ''}>
              {projectKeys.has(refKey(item)) ? 'In project' : typeNames[item.type]}
            </em>
          </button>
        )
      })}
      {values.length === 0 && (
        <div className="extension-transfer-empty">
          <Package size={28} />
          <strong>No packaged resources</strong>
          <span>Add project resources from the Export Resources tab.</span>
        </div>
      )}
    </div>
  )
}

function ResourceTransfer({
  mode,
  project,
  values,
  onChange,
  onMessage
}: {
  mode: 'export' | 'import'
  project: Project | null
  values: ExtensionResource[]
  onChange: (values: ExtensionResource[]) => void
  onMessage: (message: string) => void
}): React.JSX.Element {
  const resources = useMemo(() => projectResources(project), [project])
  const [projectId, setProjectId] = useState('')
  const [includedIndex, setIncludedIndex] = useState(-1)

  function add(items: ProjectResource[]): void {
    const keys = new Set(values.map(refKey))
    const additions = items
      .filter((item) => !keys.has(refKey(item)))
      .map<ExtensionResource>((item) => ({
        type: item.type,
        path: item.path.replace(/\//g, '\\'),
        tag: 'resource'
      }))
    if (additions.length === 0) {
      onMessage('The selected resources are already in the extension')
      return
    }
    onChange([...values, ...additions])
    onMessage(`Added ${additions.length} resource${additions.length === 1 ? '' : 's'}`)
  }

  function locate(all = false): void {
    const selected = all ? values : values[includedIndex] ? [values[includedIndex]] : []
    const projectByKey = new Map(resources.map((item) => [refKey(item), item]))
    const matches = selected.flatMap((item) => {
      const match = projectByKey.get(refKey(item))
      return match ? [match] : []
    })
    if (matches.length > 0) setProjectId(matches[0].id)
    const missing = selected.length - matches.length
    onMessage(missing
      ? `${matches.length} available in this project; ${missing} package resource file${missing === 1 ? ' is' : 's are'} unavailable`
      : `${matches.length} resource${matches.length === 1 ? '' : 's'} already available in this project`)
  }

  return (
    <div className="extension-transfer-page">
      <div className="extension-page-intro">
        <span><Package size={19} /></span>
        <div>
          <strong>{mode === 'export' ? 'Add Resources' : 'Import Resources'}</strong>
          <small>{mode === 'export'
            ? 'Select project resources to package with this extension.'
            : 'Review packaged resources and locate the ones already installed in this project.'}</small>
        </div>
      </div>
      <div className="extension-transfer">
        <section>
          <header><strong>Project</strong><small>{resources.length} resources</small></header>
          <ProjectTree project={project} selected={projectId} onSelect={setProjectId} />
        </section>
        <div className="extension-transfer-actions">
          {mode === 'export' ? (
            <>
              <button
                className="primary"
                title="Add selected resource"
                disabled={!projectId}
                onClick={() => {
                  const selected = resources.find((item) => item.id === projectId)
                  if (selected) add([selected])
                }}
              ><ArrowRight size={16} /></button>
              <button onClick={() => add(resources)}>Add All</button>
              <button
                className="danger"
                disabled={includedIndex < 0}
                onClick={() => {
                  onChange(values.filter((_item, index) => index !== includedIndex))
                  setIncludedIndex(-1)
                  onMessage('Removed resource from the extension')
                }}
              ><Trash2 size={14} /> Remove</button>
            </>
          ) : (
            <>
              <button
                className="primary"
                title="Locate selected resource in the project"
                disabled={includedIndex < 0}
                onClick={() => locate()}
              ><ArrowLeft size={16} /></button>
              <button disabled={values.length === 0} onClick={() => locate(true)}>Import All</button>
            </>
          )}
        </div>
        <section>
          <header><strong>Extension</strong><small>{values.length} resources</small></header>
          <IncludedList
            values={values}
            selected={includedIndex}
            projectItems={resources}
            onSelect={setIncludedIndex}
          />
        </section>
      </div>
    </div>
  )
}

export function ExtensionPanel({
  params,
  api
}: IDockviewPanelProps<ExtensionParams>): React.JSX.Element {
  const source = params.item.extension
  const project = useApp((state) => state.project)
  const updateExtension = useApp((state) => state.updateExtension)
  const addLog = useApp((state) => state.addLog)
  const [extension, setExtension] = useState<ExtensionData | null>(() =>
    source ? copyExtension(source) : null
  )
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [page, setPage] = useState<Page>('general')
  const [config, setConfig] = useState(() => Object.keys(source?.copyMasks ?? {})[0] || 'Default')
  const [saving, setSaving] = useState(false)
  const dirty = extension ? JSON.stringify(extension) !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  if (!extension) {
    return (
      <div className="extension-empty">
        <Puzzle size={34} />
        <strong>Extension data is unavailable</strong>
        <span>The extension descriptor is missing or could not be parsed.</span>
      </div>
    )
  }
  const data = extension
  const configs = Array.from(new Set([
    ...(project?.configs ?? []),
    ...Object.keys(data.copyMasks)
  ]))
  if (configs.length === 0) configs.push('Default')

  function patch(values: Partial<ExtensionData>): void {
    setExtension((current) => current ? { ...current, ...values } : current)
  }

  function patchVersion(index: number, value: number): void {
    const next = [...data.version] as [number, number, number]
    next[index] = Math.max(0, Math.min(9999, Number.isFinite(value) ? Math.round(value) : 0))
    patch({ version: next })
  }

  function platformEnabled(value: string): boolean {
    try {
      return (BigInt(data.copyMasks[config] ?? data.copyMasks.Default ?? '0') & BigInt(value)) !== 0n
    } catch {
      return false
    }
  }

  function setPlatform(value: string, enabled: boolean): void {
    let current = 0n
    try {
      current = BigInt(data.copyMasks[config] ?? data.copyMasks.Default ?? '0')
    } catch {
      current = 0n
    }
    const bit = BigInt(value)
    const next = enabled ? current | bit : current & ~bit
    patch({ copyMasks: { ...data.copyMasks, [config]: next.toString() } })
  }

  async function save(): Promise<void> {
    if (!extension || !dirty || saving) return
    const current = copyExtension(extension)
    setSaving(true)
    try {
      const latest = currentExtension(params.item.id)
      const savedData = copyExtension({ ...current, files: latest?.files ?? current.files })
      await window.openGms.saveExtension(params.item.file, savedData)
      updateExtension(params.item.id, savedData)
      const currentValue = JSON.stringify(current)
      setExtension((value) => value && JSON.stringify(value) === currentValue ? copyExtension(savedData) : value)
      setSaved(JSON.stringify(savedData))
      addLog(`Saved extension ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save extension ${params.item.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="extension-editor">
      <header className="extension-editor-head">
        <div className="extension-title">
          <span><Puzzle size={18} /></span>
          <div><strong>{data.name || params.item.name}</strong><small>Extension package</small></div>
        </div>
        <EditorOk api={api} />
      </header>
      <nav className="extension-tabs" aria-label="Extension pages">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              className={page === tab.id ? 'selected' : ''}
              key={tab.id}
              onClick={() => {
                setPage(tab.id)
              }}
            ><Icon size={14} /> {tab.name}</button>
          )
        })}
      </nav>

      <div className="extension-editor-body">
        {page === 'general' && (
          <div className="extension-page general">
            <div className="extension-page-intro">
              <span><Puzzle size={19} /></span>
              <div><strong>Edit your extension</strong><small>Set package identity and supported targets.</small></div>
            </div>
            <Card title="Package" detail="Identity used by GameMaker" icon={Package}>
              <div className="extension-package-fields">
                <label className="extension-field"><span>Name</span><ResourceName item={params.item} /></label>
                <label className="extension-field version">
                  <span>Version</span>
                  <div>
                    {data.version.map((part, index) => (
                      <input
                        type="number"
                        min={0}
                        max={9999}
                        value={part}
                        aria-label={`Version part ${index + 1}`}
                        key={index}
                        onChange={(event) => patchVersion(index, Number(event.target.value))}
                      />
                    ))}
                  </div>
                </label>
              </div>
            </Card>
            <Card title="Target Platforms" detail="Choose where this extension is copied" icon={Globe2} className="extension-target-card">
              <label className="extension-config">
                <span>Configuration</span>
                <select value={config} onChange={(event) => setConfig(event.target.value)}>
                  {configs.map((item) => <option value={item} key={item}>{item}</option>)}
                </select>
              </label>
              <div className="extension-platforms">
                {platforms.map((platform) => {
                  const Icon = platform.icon
                  return (
                    <label key={platform.value}>
                      <input
                        type="checkbox"
                        checked={platformEnabled(platform.value)}
                        onChange={(event) => setPlatform(platform.value, event.target.checked)}
                      />
                      <Icon size={16} />
                      <span><strong>{platform.name}</strong><small>{platform.note}</small></span>
                    </label>
                  )
                })}
              </div>
            </Card>
          </div>
        )}

        {page === 'ios' && (
          <div className="extension-page ios">
            <div className="extension-page-intro">
              <span><Smartphone size={19} /></span>
              <div><strong>iOS Setup</strong><small>Configure Objective-C linking and Info.plist injection.</small></div>
            </div>
            <div className="extension-ios-top">
              <Card title="Build Settings" icon={Settings2}>
                <TextField label="Compiler Flags" value={data.compilerFlags} onChange={(compilerFlags) => patch({ compilerFlags })} />
                <TextField label="Linker Flags" value={data.linkerFlags} onChange={(linkerFlags) => patch({ linkerFlags })} />
                <TextField label="Class Name" value={data.className} onChange={(className) => patch({ className })} />
              </Card>
              <Card title="Info.plist" detail="XML inserted into the generated plist" icon={Code2}>
                <CodeField label="Inject to Info.plist" value={data.plist} onChange={(plist) => patch({ plist })} />
              </Card>
            </div>
            <div className="extension-ios-lists">
              <Card title="System Frameworks" detail="Enable Weak when the framework is optional" icon={Boxes}>
                <FrameworkEditor values={data.systemFrameworks} onChange={(systemFrameworks) => patch({ systemFrameworks })} />
              </Card>
              <Card title="3rd Party Frameworks + Bundles" detail="Frameworks shipped with the extension" icon={Package}>
                <FrameworkEditor values={data.thirdPartyFrameworks} onChange={(thirdPartyFrameworks) => patch({ thirdPartyFrameworks })} />
              </Card>
            </div>
          </div>
        )}

        {page === 'android' && (
          <div className="extension-page android">
            <div className="extension-page-intro">
              <span><Smartphone size={19} /></span>
              <div><strong>Android Setup</strong><small>Configure Java bindings, permissions and build injections.</small></div>
            </div>
            <div className="extension-android-grid">
              <div>
                <Card title="Java Class" icon={Code2}>
                  <TextField label="Class Name" value={data.androidClassName} onChange={(androidClassName) => patch({ androidClassName })} />
                </Card>
                <Card title="Android Permissions" icon={Settings2}>
                  <PermissionEditor values={data.permissions} onChange={(permissions) => patch({ permissions })} />
                </Card>
                <Card title="Gradle Dependencies" icon={Package}>
                  <CodeField label="Inject to Gradle dependencies" value={data.gradle} rows={8} onChange={(gradle) => patch({ gradle })} />
                </Card>
              </div>
              <Card title="AndroidManifest.xml" detail="Code is inserted at the selected manifest level" icon={Code2}>
                <CodeField label="Manifest Level" value={data.androidManifest} onChange={(androidManifest) => patch({ androidManifest })} />
                <CodeField label="Application Level" value={data.androidApplication} onChange={(androidApplication) => patch({ androidApplication })} />
                <CodeField label="RunnerActivity Level" value={data.androidActivity} onChange={(androidActivity) => patch({ androidActivity })} />
              </Card>
            </div>
          </div>
        )}

        {(page === 'export' || page === 'import') && (
          <ResourceTransfer
            mode={page}
            project={project}
            values={data.includedResources}
            onChange={(includedResources) => patch({ includedResources })}
            onMessage={addLog}
          />
        )}
      </div>
    </section>
  )
}
