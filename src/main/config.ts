import { existsSync } from 'node:fs'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { DOMParser } from '@xmldom/xmldom'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>

type ConfigRef = {
  name: string
  path: string
  file: string
  folder: string
}

type ProjectConfig = {
  source: string
  eol: string
  projectFolder: string
  configsFolder: string
  refs: ConfigRef[]
}

const maxProjectSize = 32 * 1024 * 1024
const maxConfigSize = 64 * 1024 * 1024

function tag(node: XmlElement): string {
  return (node.localName || node.nodeName).toLowerCase()
}

function children(node: XmlElement): XmlElement[] {
  const result: XmlElement[] = []
  for (let index = 0; index < node.childNodes.length; index += 1) {
    const item = node.childNodes.item(index)
    if (item?.nodeType === 1) result.push(item as XmlElement)
  }
  return result
}

function inside(folder: string, file: string): boolean {
  const path = relative(folder, file)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function configName(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid configuration name')
  const name = value.trim()
  if (
    !name ||
    name.length > 80 ||
    /[<>:"/\\|?*&\x00-\x1f]/.test(name) ||
    /[. ]$/.test(name) ||
    /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
  ) {
    throw new Error('Configuration names cannot contain reserved path characters')
  }
  return name
}

function cleanPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function refName(value: string): string {
  return basename(cleanPath(value)).replace(/\.config\.gmx$/i, '')
}

function safeConfigPath(configsFolder: string, name: string, extension = ''): string {
  const target = resolve(configsFolder, `${name}${extension}`)
  if (target === configsFolder || !target.startsWith(`${configsFolder}${sep}`)) {
    throw new Error('Invalid configuration path')
  }
  return target
}

async function readProject(file: string): Promise<ProjectConfig> {
  const bytes = await readFile(file)
  if (bytes.length > maxProjectSize) throw new Error('Project file is too large')
  const source = bytes.toString('utf8')
  const errors: string[] = []
  const root = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') errors.push(message)
    }
  }).parseFromString(source, 'application/xml').documentElement
  if (!root || tag(root) !== 'assets' || errors.length > 0) throw new Error('Invalid project XML')

  const configs = children(root).find((item) => tag(item) === 'configs')
  if (!configs) throw new Error('Project configuration list is missing')
  const projectFolder = dirname(file)
  const configsFolder = resolve(projectFolder, 'Configs')
  const refs = children(configs).flatMap((item) => {
    if (tag(item) !== 'config') return []
    const path = cleanPath(item.textContent ?? '')
    const name = refName(path)
    if (!path || !name) return []
    const filePath = resolve(projectFolder, ...`${path}.config.gmx`.split('/'))
    const folderPath = resolve(projectFolder, ...path.split('/'))
    if (
      folderPath === configsFolder ||
      !inside(configsFolder, filePath) ||
      !inside(configsFolder, folderPath)
    ) {
      throw new Error('Configuration path is outside the Configs folder')
    }
    return [{ name, path, file: filePath, folder: folderPath }]
  })
  if (refs.length === 0) throw new Error('Project has no configurations')
  return {
    source,
    eol: source.includes('\r\n') ? '\r\n' : '\n',
    projectFolder,
    configsFolder,
    refs
  }
}

function findRef(project: ProjectConfig, value: unknown): ConfigRef {
  const name = configName(value)
  const found = project.refs.find((item) => item.name.toLowerCase() === name.toLowerCase())
  if (!found) throw new Error(`Configuration ${name} was not found`)
  return found
}

function ensureAvailable(project: ProjectConfig, value: unknown): string {
  const name = configName(value)
  if (project.refs.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
    throw new Error(`Configuration ${name} already exists`)
  }
  if (
    existsSync(safeConfigPath(project.configsFolder, name, '.config.gmx')) ||
    existsSync(safeConfigPath(project.configsFolder, name))
  ) {
    throw new Error(`Files for configuration ${name} already exist`)
  }
  return name
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function projectSource(project: ProjectConfig, refs: ConfigRef[]): string {
  const pattern = /<Configs\b([^>]*)\/?\s*>[\s\S]*?<\/Configs>/i
  const match = pattern.exec(project.source)
  if (!match) throw new Error('Project configuration list is missing')
  const section = [
    `<Configs${match[1]}>`,
    ...refs.map((item) => `    <Config>${xml(item.path.replace(/\//g, '\\'))}</Config>`),
    '  </Configs>'
  ].join(project.eol)
  return project.source.replace(pattern, section)
}

function configText(source: string, oldName: string, nextName: string): string {
  const escaped = oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.replace(new RegExp(`Configs[\\\\/]${escaped}(?=[\\\\/])`, 'gi'), `Configs\\${nextName}`)
}

async function writeProject(file: string, project: ProjectConfig, refs: ConfigRef[]): Promise<void> {
  const source = projectSource(project, refs)
  if (Buffer.byteLength(source, 'utf8') > maxProjectSize) throw new Error('Project file is too large')
  await writeFile(file, source, 'utf8')
}

export async function addConfig(file: string, value: unknown, baseValue?: unknown): Promise<void> {
  const project = await readProject(file)
  const name = ensureAvailable(project, value)
  const base = baseValue === undefined ? project.refs[0] : findRef(project, baseValue)
  if (!existsSync(base.file)) throw new Error(`Configuration file ${base.name} is missing`)

  const targetFile = safeConfigPath(project.configsFolder, name, '.config.gmx')
  const targetFolder = safeConfigPath(project.configsFolder, name)
  await mkdir(project.configsFolder, { recursive: true })
  try {
    const bytes = await readFile(base.file)
    if (bytes.length > maxConfigSize) throw new Error('Configuration file is too large')
    await writeFile(targetFile, configText(bytes.toString('utf8'), base.name, name), 'utf8')
    if (existsSync(base.folder)) {
      await cp(base.folder, targetFolder, { recursive: true, errorOnExist: true, force: false })
    }
    const ref: ConfigRef = {
      name,
      path: `Configs/${name}`,
      file: targetFile,
      folder: targetFolder
    }
    await writeProject(file, project, [...project.refs, ref])
  } catch (error) {
    if (existsSync(targetFolder)) await rm(targetFolder, { recursive: true, force: true })
    if (existsSync(targetFile)) await rm(targetFile, { force: true })
    throw error
  }
}

export async function renameConfig(file: string, value: unknown, nextValue: unknown): Promise<void> {
  const project = await readProject(file)
  const current = findRef(project, value)
  const name = ensureAvailable(project, nextValue)
  if (!existsSync(current.file)) throw new Error(`Configuration file ${current.name} is missing`)

  const targetFile = safeConfigPath(project.configsFolder, name, '.config.gmx')
  const targetFolder = safeConfigPath(project.configsFolder, name)
  let committed = false
  try {
    const bytes = await readFile(current.file)
    if (bytes.length > maxConfigSize) throw new Error('Configuration file is too large')
    await writeFile(targetFile, configText(bytes.toString('utf8'), current.name, name), 'utf8')
    if (existsSync(current.folder)) {
      await cp(current.folder, targetFolder, { recursive: true, errorOnExist: true, force: false })
    }
    const refs = project.refs.map((item) => item === current
      ? { name, path: `Configs/${name}`, file: targetFile, folder: targetFolder }
      : item
    )
    await writeProject(file, project, refs)
    committed = true
  } catch (error) {
    if (!committed && existsSync(targetFolder)) {
      await rm(targetFolder, { recursive: true, force: true })
    }
    if (!committed && existsSync(targetFile)) await rm(targetFile, { force: true })
    throw error
  }
  await Promise.allSettled([
    rm(current.file, { force: true }),
    rm(current.folder, { recursive: true, force: true })
  ])
}

export async function deleteConfig(file: string, value: unknown): Promise<void> {
  const project = await readProject(file)
  if (project.refs.length <= 1) throw new Error('A project must keep at least one configuration')
  const current = findRef(project, value)
  await writeProject(file, project, project.refs.filter((item) => item !== current))
  await Promise.allSettled([
    rm(current.file, { force: true }),
    rm(current.folder, { recursive: true, force: true })
  ])
}
