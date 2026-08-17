import { useEffect, useMemo, useState } from 'react'
import {
  Boxes,
  FileCode2,
  Globe2,
  Link2,
  Plus,
  Trash2
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  ExtensionData,
  ExtensionFile,
  ExtensionFunction,
  ProjectItem
} from '../../../shared/types'
import { EditorOk } from '../EditorOk'
import { useSave } from '../save'
import { useApp } from '../store'

type ExtensionItem = Extract<ProjectItem, { kind: 'resource' }>

export type ExtensionFileParams = {
  item: ExtensionItem
  fileIndex: number
}

export type ExtensionFunctionParams = ExtensionFileParams & {
  functionIndex: number
}

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

function errorText(error: unknown): string {
  if (!(error instanceof Error)) return 'Operation failed'
  return error.message.replace(/^Error invoking remote method '[^']+':\s*/i, '')
}

function copyFile(value: ExtensionFile): ExtensionFile {
  return {
    ...value,
    copyMasks: { ...value.copyMasks },
    proxyFiles: value.proxyFiles.map((item) => ({ ...item })),
    functions: value.functions.map((item) => ({ ...item, args: [...item.args] }))
  }
}

function copyFunction(value: ExtensionFunction): ExtensionFunction {
  return { ...value, args: [...value.args] }
}

function findExtension(items: ProjectItem[], id: string): ExtensionData | undefined {
  for (const item of items) {
    if (item.kind === 'group') {
      const found = findExtension(item.items, id)
      if (found) return found
    } else if (item.id === id) {
      return item.extension
    }
  }
  return undefined
}

function currentExtension(id: string): ExtensionData | undefined {
  const project = useApp.getState().project
  if (!project) return undefined
  for (const group of project.groups) {
    const found = findExtension(group.items, id)
    if (found) return found
  }
  return undefined
}

function updateFile(extension: ExtensionData, index: number, file: ExtensionFile): ExtensionData {
  return {
    ...extension,
    files: extension.files.map((item, fileIndex) => fileIndex === index ? copyFile(file) : copyFile(item))
  }
}

function Field({
  label,
  value,
  onChange,
  placeholder
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}): React.JSX.Element {
  return (
    <label className="extension-member-field">
      <span>{label}</span>
      <input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function MemberHeader({
  icon: Icon,
  title,
  detail,
  action
}: {
  icon: typeof FileCode2
  title: string
  detail: string
  action: React.ReactNode
}): React.JSX.Element {
  return (
    <header className="extension-member-head">
      <div>
        <span><Icon size={18} /></span>
        <div><strong>{title}</strong><small>{detail}</small></div>
      </div>
      {action}
    </header>
  )
}

export function ExtensionFilePanel({
  params,
  api
}: IDockviewPanelProps<ExtensionFileParams>): React.JSX.Element {
  const source = params.item.extension?.files[params.fileIndex]
  const project = useApp((state) => state.project)
  const updateExtension = useApp((state) => state.updateExtension)
  const addLog = useApp((state) => state.addLog)
  const [file, setFile] = useState<ExtensionFile | null>(() => source ? copyFile(source) : null)
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [config, setConfig] = useState(() => Object.keys(source?.copyMasks ?? {})[0] || 'Default')
  const [saving, setSaving] = useState(false)
  const dirty = file ? JSON.stringify(file) !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${file?.filename || 'Extension File'}${dirty ? ' •' : ''}`)
  }, [api, dirty, file?.filename])

  const configs = useMemo(() => {
    const values = new Set([...(project?.configs ?? []), ...Object.keys(file?.copyMasks ?? {})])
    if (values.size === 0) values.add('Default')
    return [...values]
  }, [file?.copyMasks, project?.configs])

  if (!file) {
    return <div className="extension-member-empty">Extension file data is unavailable.</div>
  }

  function patch(values: Partial<ExtensionFile>): void {
    setFile((current) => current ? { ...current, ...values } : current)
  }

  function currentMask(): bigint {
    try {
      return BigInt(file?.copyMasks[config] ?? file?.copyMasks.Default ?? '0')
    } catch {
      return 0n
    }
  }

  function setPlatform(value: string, enabled: boolean): void {
    const current = file
    if (!current) return
    const bit = BigInt(value)
    const mask = currentMask()
    patch({
      copyMasks: {
        ...current.copyMasks,
        [config]: (enabled ? mask | bit : mask & ~bit).toString()
      }
    })
  }

  async function save(): Promise<void> {
    const current = file
    if (!dirty || saving || !current) return
    setSaving(true)
    try {
      const latest = currentExtension(params.item.id)
      const latestFile = latest?.files[params.fileIndex]
      const savedFile = copyFile({
        ...current,
        functions: latestFile?.functions ?? current.functions
      })
      await window.openGms.saveExtensionFile(params.item.file, params.fileIndex, savedFile)
      if (latest) updateExtension(params.item.id, updateFile(latest, params.fileIndex, savedFile))
      const currentValue = JSON.stringify(current)
      setFile((value) => value && JSON.stringify(value) === currentValue ? copyFile(savedFile) : value)
      setSaved(JSON.stringify(savedFile))
      addLog(`Saved extension file ${savedFile.filename}.`)
    } catch (error) {
      addLog(`Failed to save extension file ${current.filename}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="extension-member-editor">
      <MemberHeader
        icon={FileCode2}
        title={file.filename || `File ${params.fileIndex + 1}`}
        detail={`${params.item.name} · Extension file`}
        action={<EditorOk api={api} />}
      />
      <div className="extension-member-body file-properties">
        <section className="extension-member-card file-main">
          <header><FileCode2 size={16} /><div><strong>File</strong><small>Library identity and lifecycle functions</small></div></header>
          <div className="extension-member-card-body">
            <Field label="Name" value={file.filename} onChange={(filename) => patch({ filename })} />
            {file.originalName && <div className="extension-origin-name"><span>Source</span><code>{file.originalName}</code></div>}
            <label className="extension-member-field">
              <span>Init Function</span>
              <select value={file.init} onChange={(event) => patch({ init: event.target.value })}>
                <option value="">None</option>
                {file.functions.map((fn, index) => <option value={fn.name} key={`${fn.name}:${index}`}>{fn.name}</option>)}
              </select>
            </label>
            <label className="extension-member-field">
              <span>Final Function</span>
              <select value={file.final} onChange={(event) => patch({ final: event.target.value })}>
                <option value="">None</option>
                {file.functions.map((fn, index) => <option value={fn.name} key={`${fn.name}:${index}`}>{fn.name}</option>)}
              </select>
            </label>
            <label className="extension-uncompress">
              <input
                type="checkbox"
                checked={file.uncompress}
                onChange={(event) => patch({ uncompress: event.target.checked })}
              />
              <span><strong>Uncompress as zip file</strong><small>Extract this file before the runner loads it.</small></span>
            </label>
          </div>
        </section>

        <section className="extension-member-card proxy-files">
          <header><Link2 size={16} /><div><strong>Proxy Files</strong><small>Alternate files used by selected targets</small></div></header>
          <div className="extension-member-card-body">
            <div className="extension-member-table">
              <div className="extension-member-table-head"><span>File name</span><span>Target</span><span /></div>
              {file.proxyFiles.map((proxy, index) => (
                <div className="extension-member-table-row" key={index}>
                  <input
                    value={proxy.name}
                    aria-label={`Proxy file ${index + 1}`}
                    onChange={(event) => patch({
                      proxyFiles: file.proxyFiles.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, name: event.target.value } : item
                      )
                    })}
                  />
                  <select
                    value={proxy.targetMask}
                    aria-label={`Proxy target ${index + 1}`}
                    onChange={(event) => patch({
                      proxyFiles: file.proxyFiles.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, targetMask: event.target.value } : item
                      )
                    })}
                  >
                    {!platforms.some((platform) => platform[1] === proxy.targetMask) && (
                      <option value={proxy.targetMask}>Mask {proxy.targetMask}</option>
                    )}
                    {platforms.map(([name, value]) => <option value={value} key={value}>{name}</option>)}
                  </select>
                  <button
                    className="icon danger"
                    title="Remove proxy file"
                    onClick={() => patch({ proxyFiles: file.proxyFiles.filter((_item, itemIndex) => itemIndex !== index) })}
                  ><Trash2 size={14} /></button>
                </div>
              ))}
              {file.proxyFiles.length === 0 && <div className="extension-member-table-empty">No proxy files</div>}
            </div>
            <button
              className="extension-member-add"
              onClick={() => patch({ proxyFiles: [...file.proxyFiles, { name: '', targetMask: '64' }] })}
            ><Plus size={14} /> Add Proxy File</button>
          </div>
        </section>

        <section className="extension-member-card copies-to">
          <header><Globe2 size={16} /><div><strong>Copies To</strong><small>Targets that receive this file</small></div></header>
          <div className="extension-member-card-body">
            <label className="extension-member-field compact">
              <span>Configuration</span>
              <select value={config} onChange={(event) => setConfig(event.target.value)}>
                {configs.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>
            <div className="extension-copy-platforms">
              {platforms.map(([name, value]) => (
                <label key={value}>
                  <input
                    type="checkbox"
                    checked={(currentMask() & BigInt(value)) !== 0n}
                    onChange={(event) => setPlatform(value, event.target.checked)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
    </section>
  )
}

function optionWithUnknown(value: number, known: number[]): React.JSX.Element | null {
  return known.includes(value) ? null : <option value={value}>Unknown ({value})</option>
}

export function ExtensionFunctionPanel({
  params,
  api
}: IDockviewPanelProps<ExtensionFunctionParams>): React.JSX.Element {
  const source = params.item.extension?.files[params.fileIndex]?.functions[params.functionIndex]
  const updateExtension = useApp((state) => state.updateExtension)
  const addLog = useApp((state) => state.addLog)
  const [fn, setFunction] = useState<ExtensionFunction | null>(() => source ? copyFunction(source) : null)
  const [saved, setSaved] = useState(() => source ? JSON.stringify(source) : '')
  const [saving, setSaving] = useState(false)
  const dirty = fn ? JSON.stringify(fn) !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${fn?.name || 'Extension Function'}${dirty ? ' •' : ''}`)
  }, [api, dirty, fn?.name])

  if (!fn) {
    return <div className="extension-member-empty">Extension function data is unavailable.</div>
  }

  function patch(values: Partial<ExtensionFunction>): void {
    setFunction((current) => current ? { ...current, ...values } : current)
  }

  async function save(): Promise<void> {
    const current = fn
    if (!dirty || saving || !current) return
    setSaving(true)
    try {
      const savedFunction = copyFunction(current)
      await window.openGms.saveExtensionFunction(
        params.item.file,
        params.fileIndex,
        params.functionIndex,
        savedFunction
      )
      const latest = currentExtension(params.item.id)
      const latestFile = latest?.files[params.fileIndex]
      if (latest && latestFile) {
        const nextFile = copyFile({
          ...latestFile,
          functions: latestFile.functions.map((item, index) =>
            index === params.functionIndex ? savedFunction : item
          )
        })
        updateExtension(params.item.id, updateFile(latest, params.fileIndex, nextFile))
      }
      const currentValue = JSON.stringify(current)
      setFunction((value) => value && JSON.stringify(value) === currentValue ? copyFunction(savedFunction) : value)
      setSaved(JSON.stringify(savedFunction))
      addLog(`Saved extension function ${savedFunction.name}.`)
    } catch (error) {
      addLog(`Failed to save extension function ${current.name}: ${errorText(error)}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="extension-member-editor">
      <MemberHeader
        icon={Boxes}
        title={fn.name || `Function ${params.functionIndex + 1}`}
        detail={`${params.item.name} · ${params.item.extension?.files[params.fileIndex]?.filename ?? 'Extension file'}`}
        action={<EditorOk api={api} />}
      />
      <div className="extension-member-body function-properties">
        <section className="extension-member-card function-main">
          <header><Boxes size={16} /><div><strong>Function</strong><small>Public name and native entry point</small></div></header>
          <div className="extension-member-card-body function-fields">
            <Field label="Name" value={fn.name} onChange={(name) => patch({ name })} />
            <Field label="External Name" value={fn.externalName} onChange={(externalName) => patch({ externalName })} />
            <label className="extension-member-field wide">
              <span>Help</span>
              <input value={fn.help} onChange={(event) => patch({ help: event.target.value })} />
            </label>
            <label className="extension-member-field">
              <span>Return Type</span>
              <select value={fn.returnType} onChange={(event) => patch({ returnType: Number(event.target.value) })}>
                {optionWithUnknown(fn.returnType, [1, 2])}
                <option value={2}>Double</option>
                <option value={1}>String</option>
              </select>
            </label>
            <label className="extension-member-field">
              <span>Type</span>
              <select value={fn.kind} onChange={(event) => patch({ kind: Number(event.target.value) })}>
                {optionWithUnknown(fn.kind, [11, 12])}
                <option value={12}>CDECL</option>
                <option value={11}>STDCALL</option>
              </select>
            </label>
          </div>
        </section>

        <section className="extension-member-card function-arguments">
          <header><Link2 size={16} /><div><strong>Arguments</strong><small>Types passed as argument0, argument1, and so on</small></div></header>
          <div className="extension-member-card-body">
            <div className="extension-argument-table">
              <div className="extension-member-table-head"><span>Key</span><span>Value</span><span /></div>
              {fn.args.map((type, index) => (
                <div className="extension-member-table-row" key={index}>
                  <code>argument{index}</code>
                  <select
                    value={type}
                    aria-label={`Argument ${index + 1} type`}
                    onChange={(event) => {
                      const args = fn.args.map((item, itemIndex) =>
                        itemIndex === index ? Number(event.target.value) : item
                      )
                      patch({ args, argCount: args.length })
                    }}
                  >
                    {optionWithUnknown(type, [1, 2])}
                    <option value={2}>Double</option>
                    <option value={1}>String</option>
                  </select>
                  <button
                    className="icon danger"
                    title="Remove argument"
                    onClick={() => {
                      const args = fn.args.filter((_item, itemIndex) => itemIndex !== index)
                      patch({ args, argCount: args.length })
                    }}
                  ><Trash2 size={14} /></button>
                </div>
              ))}
              {fn.args.length === 0 && <div className="extension-member-table-empty">No fixed arguments</div>}
            </div>
            <button
              className="extension-member-add"
              onClick={() => {
                const args = [...fn.args, 2]
                patch({ args, argCount: args.length })
              }}
            ><Plus size={14} /> Add Argument</button>
          </div>
        </section>
      </div>
    </section>
  )
}
