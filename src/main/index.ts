import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  protocol,
  session,
  shell,
  type Session
} from 'electron'
import {
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path'
import type {
  BackgroundFile,
  BuildMode,
  BuildOutput,
  BuildState,
  CodeFile,
  FontRange,
  MediaImportType,
  ObjectAction,
  Project,
  ResourceDropPosition,
  ResourceTreeRef,
  ResourceType,
  SoundFile,
  SpriteFramesFile,
  StripImage,
  UnsavedChoice
} from '../shared/types'
import { loadActionLibraries } from './actionLib'
import { saveBackground } from './background'
import { BuildService } from './build'
import { addConfig, deleteConfig, renameConfig } from './config'
import { listFonts, saveFont } from './font'
import { saveExtension, saveExtensionFile, saveExtensionFunction } from './extension'
import { loadGameInfo, saveGameInfo } from './gameInfo'
import { loadGlobalSettings, saveGlobalSettings } from './globalSettings'
import { loadObject, saveObject } from './object'
import { saveMacros } from './macro'
import { createProject } from './newProject'
import { savePath } from './path'
import { initPrefs, preparePrefs, removePref, setPref } from './prefs'
import { loadProject } from './project'
import {
  addExistingResource as addExistingProjectResource,
  checkResourceReferences,
  createResource as createProjectResource,
  createResourceGroup,
  deleteResourceItem,
  duplicateResource,
  importImageResource,
  importSoundResource,
  moveResourceItem,
  renameResourceItem,
  resourceFilter,
  resourceItemPath,
  sortResourceGroup
} from './resourceTree'
import { loadRoom, saveRoom } from './room'
import { saveSound } from './sound'
import { saveShader } from './shader'
import { saveSprite, writeSpriteFrames } from './sprite'
import { loadTimeline, saveTimeline } from './timeline'

let mainWindow: BrowserWindow | null = null
let projectFolder: string | null = null
let projectPath: string | null = null
let projectName: string | null = null
let projectTempRoot: string | null = null
let gameInfoPath: string | null = null
let actionLibraries: ReturnType<typeof loadActionLibraries> | null = null
let dirtyCount = 0
let allowWindowClose = false
let closePromptOpen = false
let preparingQuit = false

function sendBuildState(state: BuildState): void {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return
  mainWindow.webContents.send('build:state', state)
}

function sendBuildOutput(output: BuildOutput): void {
  if (!mainWindow || mainWindow.isDestroyed() || mainWindow.webContents.isDestroyed()) return
  mainWindow.webContents.send('build:output', output)
}

const builds = new BuildService({ state: sendBuildState, output: sendBuildOutput })

function projectArg(args: string[]): string | null {
  for (let index = 1; index < args.length; index += 1) {
    const value = args[index]
    if (value === '--project' || value === '-p') return args[index + 1] || null
    if (value.startsWith('--project=')) return value.slice('--project='.length) || null
  }

  return args.slice(1).find((value) => /\.project\.gmx$/i.test(value)) ?? null
}

const startFile = projectArg(process.argv)
const legacyPrefs = preparePrefs()

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'opengms',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

function inside(folder: string, file: string): boolean {
  const path = relative(folder, file)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
    throw error
  }
}

function projectFilePath(path: string): string {
  if (/\.project\.gmx$/i.test(path)) return path
  if (/\.project$/i.test(path)) return `${path}.gmx`
  if (/\.gmx$/i.test(path)) return `${path.slice(0, -4)}.project.gmx`
  return `${path}.project.gmx`
}

const audioExtensions = new Set(['.wav', '.mp3', '.ogg'])
const imageExtensions = new Set(['.png', '.jpg', '.jpeg'])
const mediaExtensions = new Set([...audioExtensions, ...imageExtensions])

async function droppedFilePath(
  file: unknown,
  extensions: Set<string>,
  label: string
): Promise<string> {
  if (typeof file !== 'string' || !isAbsolute(file)) throw new Error('Invalid media path')
  const path = resolve(file)
  if (!extensions.has(extname(path).toLowerCase())) throw new Error(`Unsupported ${label} format`)
  const info = await stat(path)
  if (!info.isFile()) throw new Error(`Invalid ${label} file`)
  if (info.size < 1 || info.size > 128 * 1024 * 1024) throw new Error(`${label[0].toUpperCase()}${label.slice(1)} file is too large`)
  return path
}

async function droppedImage(file: unknown): Promise<{
  file: string
  png: Buffer
  width: number
  height: number
}> {
  const path = await droppedFilePath(file, imageExtensions, 'image')
  const source = nativeImage.createFromBuffer(await readFile(path), { scaleFactor: 1 })
  if (source.isEmpty()) throw new Error('Unsupported or invalid image')
  const { width, height } = source.getSize()
  if (
    width < 1 ||
    height < 1 ||
    width > 32767 ||
    height > 32767 ||
    width * height > 64 * 1024 * 1024
  ) {
    throw new Error('Unsupported image size')
  }
  const png = source.toPNG()
  if (png.length < 8 || png.length > 128 * 1024 * 1024) throw new Error('Could not convert image')
  return { file: path, png, width, height }
}

function clipboardImage(): { png: Buffer; width: number; height: number } | null {
  const source = clipboard.readImage()
  if (source.isEmpty()) return null
  const { width, height } = source.getSize()
  if (
    width < 1 ||
    height < 1 ||
    width > 32767 ||
    height > 32767 ||
    width * height > 64 * 1024 * 1024
  ) {
    throw new Error('Unsupported clipboard image size')
  }
  const png = source.toPNG()
  if (png.length < 8 || png.length > 128 * 1024 * 1024) {
    throw new Error('Could not read the clipboard image')
  }
  return { png, width, height }
}

function pngData(value: unknown, maxSize = 128 * 1024 * 1024): Buffer {
  if (typeof value !== 'string' || value.length > Math.ceil(maxSize * 1.4)) {
    throw new Error('Invalid PNG image')
  }
  const match = /^data:image\/png;base64,([a-z0-9+/=]+)$/i.exec(value)
  if (!match) throw new Error('Invalid PNG image')
  const data = Buffer.from(match[1], 'base64')
  if (
    data.length < 24 ||
    data.length > maxSize ||
    data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    data.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) {
    throw new Error('Invalid PNG image')
  }
  return data
}

async function pngSize(file: string): Promise<{ width: number; height: number }> {
  const handle = await open(file, 'r')
  const header = Buffer.alloc(24)
  try {
    const result = await handle.read(header, 0, header.length, 0)
    if (
      result.bytesRead < header.length ||
      header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
      header.subarray(12, 16).toString('ascii') !== 'IHDR'
    ) {
      throw new Error('Invalid PNG image')
    }
    const width = header.readUInt32BE(16)
    const height = header.readUInt32BE(20)
    if (width < 1 || height < 1 || width > 32767 || height > 32767) {
      throw new Error('Unsupported image size')
    }
    return { width, height }
  } finally {
    await handle.close()
  }
}

function rangesFromText(value: string): FontRange[] {
  const codes = Array.from(new Set(
    Array.from(value, (character) => character.codePointAt(0) ?? 0)
      .filter((code) => code >= 32 && code <= 65535)
  )).sort((left, right) => left - right)
  const ranges: FontRange[] = []

  for (const code of codes) {
    const last = ranges[ranges.length - 1]
    if (last && code === last.end + 1) last.end = code
    else ranges.push({ start: code, end: code })
  }
  return ranges
}

async function confirmUnsaved(
  window: BrowserWindow,
  title: string,
  count: number,
  all: boolean
): Promise<UnsavedChoice> {
  const multiple = all || count > 1
  const result = await dialog.showMessageBox(window, {
    type: 'warning',
    title: 'Unsaved Changes',
    message: multiple
      ? `${count} ${count === 1 ? 'resource has' : 'resources have'} unsaved changes.`
      : `Save changes to “${title}” before closing?`,
    detail: multiple ? 'Save your changes before continuing?' : 'Your changes will be lost if you do not save them.',
    buttons: [multiple ? 'Save All' : 'Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    noLink: true
  })
  return result.response === 0 ? 'save' : result.response === 1 ? 'discard' : 'cancel'
}

function stringsFromCode(source: string): string {
  let result = ''
  for (let index = 0; index < source.length; index += 1) {
    const quote = source[index]
    if (quote !== '"' && quote !== "'") continue

    for (index += 1; index < source.length; index += 1) {
      const character = source[index]
      if (character === quote) break
      if (character !== '\\') {
        result += character
        continue
      }

      const escaped = source[index + 1]
      if (!escaped) break
      const simple: Record<string, string> = { n: '\n', r: '\r', t: '\t' }
      result += simple[escaped] ?? escaped
      index += 1
    }
  }
  return result
}

async function rangesFromCode(folder: string): Promise<FontRange[]> {
  const parts: string[] = []
  let files = 0
  let bytes = 0
  const maxFiles = 4000
  const maxBytes = 32 * 1024 * 1024
  const maxFileBytes = 8 * 1024 * 1024

  function addCode(source: string): void {
    const strings = stringsFromCode(source)
    if (strings) parts.push(strings)
  }

  function addAction(action: ObjectAction): void {
    addCode(action.code)
    for (const argument of action.args) addCode(argument.value)
  }

  async function visit(
    path: string,
    suffix: string,
    load: (file: string) => Promise<void>
  ): Promise<void> {
    if (files >= maxFiles || bytes >= maxBytes) return
    let entries
    try {
      entries = await readdir(path, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const file = join(path, entry.name)
      if (entry.isDirectory()) await visit(file, suffix, load)
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(suffix)) {
        let size = 0
        try {
          size = (await stat(file)).size
        } catch {
          continue
        }
        if (size > maxFileBytes || bytes + size > maxBytes) continue
        files += 1
        bytes += size
        await load(file)
      }
      if (files >= maxFiles || bytes >= maxBytes) return
    }
  }

  await visit(join(folder, 'scripts'), '.gml', async (file) => {
    addCode(await readFile(file, 'utf8'))
  })
  await visit(join(folder, 'objects'), '.object.gmx', async (file) => {
    const object = await loadObject(file)
    for (const event of object?.events ?? []) {
      for (const action of event.actions) addAction(action)
    }
  })
  await visit(join(folder, 'timelines'), '.timeline.gmx', async (file) => {
    const timeline = await loadTimeline(file)
    for (const moment of timeline?.moments ?? []) {
      for (const action of moment.actions) addAction(action)
    }
  })
  await visit(join(folder, 'rooms'), '.room.gmx', async (file) => {
    const room = await loadRoom(file)
    if (!room) return
    addCode(room.code)
    for (const instance of room.instances) addCode(instance.code)
  })
  return rangesFromText(parts.join('\n'))
}

function assetType(file: string): string | undefined {
  switch (extname(file).toLowerCase()) {
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.gif':
      return 'image/gif'
    case '.bmp':
      return 'image/bmp'
    case '.webp':
      return 'image/webp'
    case '.ico':
      return 'image/x-icon'
    case '.wav':
      return 'audio/wav'
    case '.mp3':
      return 'audio/mpeg'
    case '.ogg':
      return 'audio/ogg'
    default:
      return undefined
  }
}

type ByteRange = { start: number; end: number }

function byteRange(value: string | null, size: number): ByteRange | null | undefined {
  if (!value) return undefined
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim())
  if (!match || (!match[1] && !match[2]) || size === 0) return null

  let start: number
  let end: number
  if (!match[1]) {
    const length = Number.parseInt(match[2], 10)
    if (!Number.isFinite(length) || length <= 0) return null
    start = Math.max(0, size - length)
    end = size - 1
  } else {
    start = Number.parseInt(match[1], 10)
    end = match[2] ? Number.parseInt(match[2], 10) : size - 1
    if (!Number.isFinite(start) || !Number.isFinite(end)) return null
    end = Math.min(end, size - 1)
  }

  return start < 0 || start >= size || end < start ? null : { start, end }
}

async function readBytes(file: string, range: ByteRange): Promise<Uint8Array<ArrayBuffer>> {
  const handle = await open(file, 'r')
  const data = Buffer.allocUnsafe(range.end - range.start + 1)
  let offset = 0

  try {
    while (offset < data.length) {
      const result = await handle.read(data, offset, data.length - offset, range.start + offset)
      if (result.bytesRead === 0) break
      offset += result.bytesRead
    }
  } finally {
    await handle.close()
  }

  return new Uint8Array(data.subarray(0, offset))
}

async function openAsset(request: Request): Promise<Response> {
  if (!projectFolder || !projectPath || !['GET', 'HEAD'].includes(request.method)) {
    return new Response('Not found', { status: 404 })
  }

  const url = new URL(request.url)
  if (url.hostname !== 'asset' || url.searchParams.get('project') !== projectPath) {
    return new Response('Not found', { status: 404 })
  }

  let path: string
  try {
    const name = decodeURIComponent(url.pathname.slice(1))
    path = resolve(projectFolder, ...name.split('/').filter(Boolean))
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  if (!inside(projectFolder, path)) return new Response('Forbidden', { status: 403 })

  const type = assetType(path)
  if (!type) return new Response('Not found', { status: 404 })

  try {
    const info = await stat(path)
    if (!info.isFile()) return new Response('Not found', { status: 404 })

    const range = byteRange(request.headers.get('range'), info.size)
    const headers = new Headers({
      'content-type': type,
      'content-length': String(range ? range.end - range.start + 1 : info.size),
      'accept-ranges': 'bytes',
      'access-control-allow-origin': '*',
      'cross-origin-resource-policy': 'cross-origin',
      'cache-control': 'no-cache'
    })

    if (range === null) {
      headers.set('content-range', `bytes */${info.size}`)
      headers.set('content-length', '0')
      return new Response(null, { status: 416, headers })
    }
    if (range) headers.set('content-range', `bytes ${range.start}-${range.end}/${info.size}`)
    if (request.method === 'HEAD') {
      return new Response(null, { status: range ? 206 : 200, headers })
    }

    const bytes = await readBytes(path, range ?? { start: 0, end: info.size - 1 })
    return new Response(bytes, {
      status: range ? 206 : 200,
      headers
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

function createWindow(webSession: Session): void {
  dirtyCount = 0
  allowWindowClose = false
  closePromptOpen = false
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1000,
    minHeight: 650,
    show: false,
    backgroundColor: '#0f1115',
    title: 'OpenGMS',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: webSession
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('close', (event) => {
    const window = mainWindow
    if (!window || allowWindowClose || dirtyCount === 0) return
    event.preventDefault()
    if (closePromptOpen) return

    closePromptOpen = true
    void confirmUnsaved(window, 'OpenGMS project', dirtyCount, true).then((choice) => {
      if (choice === 'cancel') {
        closePromptOpen = false
      } else if (choice === 'discard') {
        allowWindowClose = true
        window.close()
      } else {
        window.webContents.send('window:save-and-close')
      }
    }).catch(() => {
      closePromptOpen = false
    })
  })
  mainWindow.on('closed', () => {
    void builds.stop()
    mainWindow = null
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

}

async function removeTempProject(root: string): Promise<void> {
  const temp = resolve(app.getPath('temp'))
  const target = resolve(root)
  if (
    !inside(temp, target) ||
    !basename(target).toLowerCase().startsWith('opengms-untitled-')
  ) return
  await rm(target, { recursive: true, force: true }).catch(() => undefined)
}

async function openProjectFile(file: string, tempRoot: string | null = null): Promise<Project> {
  const project = await loadProject(resolve(file))
  const previousTemp = projectTempRoot
  projectFolder = project.folder
  projectPath = project.path
  projectName = project.name
  projectTempRoot = tempRoot
  gameInfoPath = project.gameInfoFile
  project.untitled = tempRoot !== null
  if (previousTemp && previousTemp !== tempRoot) await removeTempProject(previousTemp)
  return project
}

async function createUntitledProject(): Promise<Project> {
  const root = await mkdtemp(join(resolve(app.getPath('temp')), 'opengms-untitled-'))
  try {
    const file = await createProject(join(root, 'Untitled.project.gmx'))
    return await openProjectFile(file, root)
  } catch (error) {
    await removeTempProject(root)
    throw error
  }
}

ipcMain.handle('prefs:init', (_event, legacy: unknown) => initPrefs(legacy))
ipcMain.handle('prefs:set', (_event, key: unknown, value: unknown) => setPref(key, value))
ipcMain.handle('prefs:remove', (_event, key: unknown) => removePref(key))

ipcMain.handle('project:start', async (): Promise<Project | null> => {
  if (projectPath) return openProjectFile(projectPath, projectTempRoot)
  return startFile ? openProjectFile(startFile) : createUntitledProject()
})

ipcMain.handle('project:reveal', async (): Promise<void> => {
  if (!projectFolder) throw new Error('No project is open')
  const message = await shell.openPath(projectFolder)
  if (message) throw new Error(message)
})

ipcMain.handle(
  'window:confirm-unsaved',
  async (event, title: unknown, count: unknown, all: unknown): Promise<UnsavedChoice> => {
    const window = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
    if (!window) return 'cancel'
    const safeTitle = typeof title === 'string' && title.trim() ? title.trim().slice(0, 160) : 'Resource'
    const safeCount = typeof count === 'number' && Number.isFinite(count)
      ? Math.max(1, Math.min(10000, Math.round(count)))
      : 1
    return confirmUnsaved(window, safeTitle, safeCount, all === true)
  }
)

ipcMain.handle('project:new', async (): Promise<Project | null> => {
  if (builds.busy) throw new Error('Stop the current build or game before creating another project')
  return createUntitledProject()
})

ipcMain.handle('project:open', async (): Promise<Project | null> => {
  if (builds.busy) throw new Error('Stop the current build or game before opening another project')
  const window = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!window) return null

  const result = await dialog.showOpenDialog(window, {
    title: 'Open Project',
    properties: ['openFile'],
    filters: [
      {
        name: 'GameMaker Studio 1.4 Projects',
        extensions: ['project.gmx']
      },
      { name: 'All Files', extensions: ['*'] }
    ]
  })

  const path = result.filePaths[0]
  if (result.canceled || !path) return null

  return openProjectFile(path)
})

ipcMain.handle('project:open-file', async (_event, file: unknown): Promise<Project> => {
  if (builds.busy) throw new Error('Stop the current build or game before opening another project')
  if (typeof file !== 'string' || !/\.project\.gmx$/i.test(file)) {
    throw new Error('Drop a valid .project.gmx project file')
  }
  return openProjectFile(file)
})

ipcMain.handle('project:save-as', async (): Promise<Project | null> => {
  if (builds.busy) throw new Error('Stop the current build or game before saving the project elsewhere')
  const window = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!window) return null
  if (!projectFolder || !projectPath) throw new Error('No project is open')

  const currentName = basename(projectPath).replace(/\.project\.gmx$/i, '')
  let defaultPath: string
  if (projectTempRoot) {
    const documents = app.getPath('documents')
    let name = 'New Project'
    for (let index = 2; await pathExists(resolve(documents, `${name}.gmx`)); index += 1) {
      name = `New Project ${index}`
    }
    defaultPath = resolve(documents, `${name}.project.gmx`)
  } else {
    defaultPath = resolve(dirname(projectFolder), `${currentName} Copy.project.gmx`)
  }
  const result = await dialog.showSaveDialog(window, {
    title: 'Save Project As',
    defaultPath,
    properties: ['createDirectory', 'showOverwriteConfirmation'],
    filters: [
      {
        name: 'GameMaker Studio 1.4 Projects',
        extensions: ['project.gmx']
      }
    ]
  })

  if (result.canceled || !result.filePath) return null

  const selectedFile = resolve(projectFilePath(result.filePath))
  const name = basename(selectedFile).replace(/\.project\.gmx$/i, '').trim()
  if (!name) throw new Error('Enter a project name')

  const folderName = `${name}.gmx`
  const selectedFolder = dirname(selectedFile)
  const targetFolder = basename(selectedFolder).toLowerCase() === folderName.toLowerCase()
    ? selectedFolder
    : resolve(selectedFolder, folderName)
  const targetProject = resolve(targetFolder, `${name}.project.gmx`)
  const sourceFolder = resolve(projectFolder)

  if (inside(sourceFolder, targetFolder) || inside(targetFolder, sourceFolder)) {
    throw new Error('Choose a location outside the current project folder')
  }
  if (await pathExists(targetFolder)) {
    throw new Error(`A project folder named ${folderName} already exists`)
  }

  const tempFolder = await mkdtemp(join(dirname(targetFolder), '.opengms-save-'))
  const stagedFolder = join(tempFolder, folderName)

  try {
    const sourceBuild = resolve(sourceFolder, 'build')
    await cp(sourceFolder, stagedFolder, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: (source) => !inside(sourceBuild, resolve(source))
    })

    const copiedProject = join(stagedFolder, basename(projectPath))
    const stagedProject = join(stagedFolder, `${name}.project.gmx`)
    if (copiedProject !== stagedProject) await rename(copiedProject, stagedProject)

    await rename(stagedFolder, targetFolder)
  } finally {
    await rm(tempFolder, { recursive: true, force: true }).catch(() => undefined)
  }

  return openProjectFile(targetProject)
})

function buildConfig(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Invalid build configuration')
  const config = value.trim()
  if (!config || config.length > 160 || /[\u0000-\u001f]/.test(config)) {
    throw new Error('Invalid build configuration')
  }
  return config
}

function projectHasRoom(project: Project): boolean {
  function hasRoom(items: Project['groups'][number]['items']): boolean {
    return items.some((item) => (
      item.kind === 'group' ? hasRoom(item.items) : item.type === 'room'
    ))
  }

  return project.groups.some((group) => group.type === 'room' && hasRoom(group.items))
}

ipcMain.handle('build:state', (): BuildState => builds.state)

ipcMain.handle(
  'build:start',
  async (event, mode: unknown, config: unknown): Promise<BuildState> => {
    if (!projectFolder || !projectPath || !projectName) throw new Error('No project is open')
    if (mode !== 'build' && mode !== 'run') throw new Error('Invalid build mode')
    const project = await loadProject(projectPath)
    if (!projectHasRoom(project)) {
      const window = BrowserWindow.fromWebContents(event.sender) ?? mainWindow
      if (window) {
        await dialog.showMessageBox(window, {
          type: 'warning',
          title: mode === 'run' ? 'Cannot Run Project' : 'Cannot Build Project',
          message: 'The project does not contain a room.',
          detail: 'Create at least one room before building or running the project.',
          buttons: ['OK'],
          defaultId: 0
        })
      }
      return builds.state
    }
    return builds.start(
      mode as BuildMode,
      { folder: projectFolder, path: projectPath, name: projectName },
      buildConfig(config)
    )
  }
)

ipcMain.handle('build:clean', (): BuildState => {
  if (!projectFolder || !projectPath || !projectName) throw new Error('No project is open')
  return builds.start(
    'clean',
    { folder: projectFolder, path: projectPath, name: projectName },
    ''
  )
})

ipcMain.handle('build:stop', async (): Promise<BuildState> => builds.stop())

function currentProjectPath(): string {
  if (!projectPath) throw new Error('No project is open')
  return projectPath
}

async function trashResourceFiles(files: string[]): Promise<void> {
  for (const file of files) {
    try {
      await shell.trashItem(file)
    } catch {
      // The project no longer references this file. Leave it in place if the OS cannot trash it.
    }
  }
}

ipcMain.handle(
  'resource:create',
  async (_event, type: ResourceType, groupPath: unknown): Promise<Project> => {
    const file = currentProjectPath()
    await createProjectResource(file, type, groupPath)
    return loadProject(file)
  }
)

ipcMain.handle(
  'resource:add-existing',
  async (_event, type: ResourceType, groupPath: unknown): Promise<Project | null> => {
    const file = currentProjectPath()
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      title: `Add Existing ${type[0].toUpperCase()}${type.slice(1)}`,
      properties: ['openFile'],
      filters: resourceFilter(type)
    })
    const source = result.filePaths[0]
    if (result.canceled || !source) return null
    await addExistingProjectResource(file, type, groupPath, source)
    return loadProject(file)
  }
)

ipcMain.handle(
  'resource:import-media',
  async (_event, source: unknown, type: unknown): Promise<Project> => {
    const file = currentProjectPath()
    if (!['sprite', 'background', 'sound', 'file'].includes(type as string)) {
      throw new Error('Invalid media resource type')
    }
    if (type === 'file') {
      await addExistingProjectResource(
        file,
        'file',
        [],
        await droppedFilePath(source, mediaExtensions, 'media')
      )
    } else if (type === 'sound') {
      await importSoundResource(file, await droppedFilePath(source, audioExtensions, 'audio'))
    } else {
      const image = await droppedImage(source)
      await importImageResource(
        file,
        type as Extract<MediaImportType, 'sprite' | 'background'>,
        basename(image.file),
        image.png,
        image.width,
        image.height
      )
    }
    return loadProject(file)
  }
)

ipcMain.handle('resource:duplicate', async (_event, ref: ResourceTreeRef): Promise<Project> => {
  const file = currentProjectPath()
  await duplicateResource(file, ref)
  return loadProject(file)
})

ipcMain.handle(
  'resource:create-group',
  async (_event, type: ResourceType, groupPath: unknown): Promise<Project> => {
    const file = currentProjectPath()
    await createResourceGroup(file, type, groupPath)
    return loadProject(file)
  }
)

ipcMain.handle(
  'resource:sort',
  async (_event, type: ResourceType, groupPath: unknown): Promise<Project> => {
    const file = currentProjectPath()
    await sortResourceGroup(file, type, groupPath)
    return loadProject(file)
  }
)

ipcMain.handle('resource:delete', async (_event, ref: ResourceTreeRef): Promise<Project> => {
  const file = currentProjectPath()
  const removed = await deleteResourceItem(file, ref)
  await trashResourceFiles(removed)
  return loadProject(file)
})

ipcMain.handle(
  'resource:rename',
  async (_event, ref: ResourceTreeRef, name: unknown): Promise<Project> => {
    const file = currentProjectPath()
    const removed = await renameResourceItem(file, ref, name)
    await trashResourceFiles(removed)
    return loadProject(file)
  }
)

ipcMain.handle(
  'resource:move',
  async (
    _event,
    source: ResourceTreeRef,
    target: ResourceTreeRef,
    position: ResourceDropPosition
  ): Promise<Project> => {
    const file = currentProjectPath()
    await moveResourceItem(file, source, target, position)
    return loadProject(file)
  }
)

ipcMain.handle('resource:reveal', async (_event, ref: ResourceTreeRef): Promise<void> => {
  const path = await resourceItemPath(currentProjectPath(), ref)
  try {
    const info = await stat(path)
    if (info.isDirectory()) await shell.openPath(path)
    else shell.showItemInFolder(path)
  } catch {
    shell.showItemInFolder(dirname(path))
  }
})

ipcMain.handle('resource:open-external', async (_event, ref: ResourceTreeRef): Promise<string> => {
  const path = await resourceItemPath(currentProjectPath(), ref, true)
  return shell.openPath(path)
})

ipcMain.handle('resource:references', async (_event, ref: ResourceTreeRef) => {
  return checkResourceReferences(currentProjectPath(), ref)
})

function currentGameInfoPath(): string {
  if (!projectFolder || !gameInfoPath) throw new Error('No project is open')
  const path = resolve(gameInfoPath)
  if (!inside(projectFolder, path) || extname(path).toLowerCase() !== '.rtf') {
    throw new Error('Invalid Game Information path')
  }
  return path
}

ipcMain.handle('game-info:read', async () => loadGameInfo(currentGameInfoPath()))

ipcMain.handle('game-info:save', async (_event, data: unknown): Promise<void> => {
  await saveGameInfo(currentGameInfoPath(), data)
})

ipcMain.handle('global-settings:read', async (_event, config: unknown) => {
  if (!projectPath) throw new Error('No project is open')
  return loadGlobalSettings(projectPath, config)
})

ipcMain.handle(
  'global-settings:save',
  async (_event, config: unknown, data: unknown): Promise<Project> => {
    if (!projectPath) throw new Error('No project is open')
    await saveGlobalSettings(projectPath, config, data)
    return loadProject(projectPath)
  }
)

ipcMain.handle('macro:save', async (_event, file: unknown, macros: unknown): Promise<void> => {
  if (!projectFolder || !projectPath || typeof file !== 'string') {
    throw new Error('No project is open')
  }
  const path = resolve(file)
  const isProject = path === projectPath
  const isConfig = inside(resolve(projectFolder, 'Configs'), path) &&
    path.toLowerCase().endsWith('.config.gmx')
  if (!isProject && !isConfig) throw new Error('Invalid macro path')
  await saveMacros(path, macros)
})

ipcMain.handle('config:add', async (_event, name: unknown, base: unknown): Promise<Project> => {
  if (!projectPath) throw new Error('No project is open')
  await addConfig(projectPath, name, base)
  return loadProject(projectPath)
})

ipcMain.handle(
  'config:rename',
  async (_event, name: unknown, nextName: unknown): Promise<Project> => {
    if (!projectPath) throw new Error('No project is open')
    await renameConfig(projectPath, name, nextName)
    return loadProject(projectPath)
  }
)

ipcMain.handle('config:delete', async (_event, name: unknown): Promise<Project> => {
  if (!projectPath) throw new Error('No project is open')
  await deleteConfig(projectPath, name)
  return loadProject(projectPath)
})

const maxScriptSize = 16 * 1024 * 1024

function scriptPath(file: unknown): string {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || extname(path).toLowerCase() !== '.gml') {
    throw new Error('Invalid script path')
  }
  return path
}

ipcMain.handle('script:read', async (_event, file: unknown): Promise<CodeFile> => {
  const path = scriptPath(file)
  const info = await stat(path)
  if (!info.isFile() || info.size > maxScriptSize) throw new Error('Script file is too large')

  const data = await readFile(path)
  const bom = data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf
  const text = data.subarray(bom ? 3 : 0).toString('utf8')
  if (text.includes('\0')) throw new Error('Invalid script file')

  return {
    text,
    bom,
    eol: text.includes('\r\n') ? 'crlf' : 'lf'
  }
})

ipcMain.handle(
  'script:save',
  async (_event, file: unknown, code: unknown): Promise<void> => {
    const path = scriptPath(file)
    if (!code || typeof code !== 'object') throw new Error('Invalid script data')

    const value = code as Partial<CodeFile>
    if (
      typeof value.text !== 'string' ||
      typeof value.bom !== 'boolean' ||
      (value.eol !== 'lf' && value.eol !== 'crlf') ||
      value.text.includes('\0') ||
      Buffer.byteLength(value.text, 'utf8') > maxScriptSize
    ) {
      throw new Error('Invalid script data')
    }

    const newline = value.eol === 'crlf' ? '\r\n' : '\n'
    const text = value.text.replace(/\r\n|\r|\n/g, newline)
    const body = Buffer.from(text, 'utf8')
    const data = value.bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body
    await writeFile(path, data)
  }
)

ipcMain.handle('actions:load', async () => {
  if (!actionLibraries) {
    const folder = app.isPackaged
      ? join(process.resourcesPath, 'action-libs')
      : join(app.getAppPath(), 'assets', 'action-libs')
    actionLibraries = loadActionLibraries(folder).catch((error) => {
      actionLibraries = null
      throw error
    })
  }
  return actionLibraries
})

ipcMain.handle('object:save', async (_event, file: unknown, object: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.object.gmx')) {
    throw new Error('Invalid object path')
  }
  await saveObject(path, object)
})

ipcMain.handle('timeline:save', async (_event, file: unknown, timeline: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.timeline.gmx')) {
    throw new Error('Invalid timeline path')
  }
  await saveTimeline(path, timeline)
})

ipcMain.handle('path:save', async (_event, file: unknown, pathData: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.path.gmx')) {
    throw new Error('Invalid path resource')
  }
  await savePath(path, pathData)
})

ipcMain.handle('room:read', async (_event, file: unknown) => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.room.gmx')) {
    throw new Error('Invalid room path')
  }
  const room = await loadRoom(path)
  if (!room) throw new Error('Could not read the room file')
  return room
})

ipcMain.handle('room:save', async (_event, file: unknown, room: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.room.gmx')) {
    throw new Error('Invalid room path')
  }
  await saveRoom(path, room)
})

ipcMain.handle('extension:save', async (_event, file: unknown, extension: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.extension.gmx')) {
    throw new Error('Invalid extension path')
  }
  await saveExtension(path, extension)
})

ipcMain.handle(
  'extension:file-save',
  async (_event, file: unknown, index: unknown, data: unknown): Promise<void> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const path = resolve(file)
    if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.extension.gmx')) {
      throw new Error('Invalid extension path')
    }
    await saveExtensionFile(path, index as number, data)
  }
)

ipcMain.handle(
  'extension:function-save',
  async (
    _event,
    file: unknown,
    fileIndex: unknown,
    functionIndex: unknown,
    data: unknown
  ): Promise<void> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const path = resolve(file)
    if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.extension.gmx')) {
      throw new Error('Invalid extension path')
    }
    await saveExtensionFunction(path, fileIndex as number, functionIndex as number, data)
  }
)

ipcMain.handle('shader:save', async (_event, file: unknown, shader: unknown): Promise<void> => {
  if (!projectFolder || !projectPath || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || extname(path).toLowerCase() !== '.shader') {
    throw new Error('Invalid shader path')
  }
  await saveShader(path, projectPath, shader)
})

ipcMain.handle('sprite:save', async (_event, file: unknown, sprite: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.sprite.gmx')) {
    throw new Error('Invalid sprite path')
  }
  await saveSprite(path, projectFolder, sprite)
})

ipcMain.handle('sprite:frames-open', async (): Promise<StripImage[] | null> => {
  if (!projectFolder) throw new Error('No project is open')
  const window = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!window) return null
  const result = await dialog.showOpenDialog(window, {
    title: 'Load Sprite Images',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  if (result.filePaths.length > 2048) throw new Error('Too many sprite images selected')

  const images: StripImage[] = []
  let total = 0
  for (const file of result.filePaths) {
    const image = await droppedImage(file)
    total += image.png.length
    if (total > 256 * 1024 * 1024) throw new Error('Sprite images are too large')
    images.push({
      name: basename(image.file),
      dataUrl: `data:image/png;base64,${image.png.toString('base64')}`,
      width: image.width,
      height: image.height
    })
  }
  return images
})

ipcMain.handle(
  'sprite:frames-paste',
  async (_event, file: unknown): Promise<SpriteFramesFile | null> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const path = resolve(file)
    if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.sprite.gmx')) {
      throw new Error('Invalid sprite path')
    }
    const image = clipboardImage()
    if (!image) return null
    return writeSpriteFrames(path, projectFolder, [
      `data:image/png;base64,${image.png.toString('base64')}`
    ])
  }
)

ipcMain.handle('sprite:strip-open', async (): Promise<StripImage | null> => {
  if (!projectFolder) throw new Error('No project is open')
  const window = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!window) return null
  const result = await dialog.showOpenDialog(window, {
    title: 'Load Sprite Strip',
    properties: ['openFile'],
    filters: [
      { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  const file = result.filePaths[0]
  if (result.canceled || !file) return null
  const image = await droppedImage(file)
  return {
    name: basename(image.file),
    dataUrl: `data:image/png;base64,${image.png.toString('base64')}`,
    width: image.width,
    height: image.height
  }
})

ipcMain.handle(
  'sprite:frames-write',
  async (_event, file: unknown, images: unknown): Promise<SpriteFramesFile> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const path = resolve(file)
    if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.sprite.gmx')) {
      throw new Error('Invalid sprite path')
    }
    return writeSpriteFrames(path, projectFolder, images)
  }
)

ipcMain.handle(
  'sprite:strip-save',
  async (_event, name: unknown, value: unknown): Promise<string | null> => {
    if (!projectFolder || typeof name !== 'string') throw new Error('No project is open')
    const data = pngData(value, 192 * 1024 * 1024)
    const window = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!window) return null
    const stem = basename(name).replace(/\.png$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'sprite'
    const result = await dialog.showSaveDialog(window, {
      title: 'Save Sprite Strip',
      defaultPath: `${stem}_strip.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return null
    await writeFile(result.filePath, data)
    return result.filePath
  }
)

ipcMain.handle('sound:save', async (_event, file: unknown, sound: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.sound.gmx')) {
    throw new Error('Invalid sound path')
  }
  await saveSound(path, sound)
})

ipcMain.handle('sound:replace', async (_event, file: unknown): Promise<SoundFile | null> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const descriptor = resolve(file)
  if (!inside(projectFolder, descriptor) || !descriptor.toLowerCase().endsWith('.sound.gmx')) {
    throw new Error('Invalid sound path')
  }

  const window = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!window) return null
  const result = await dialog.showOpenDialog(window, {
    title: 'Load Sound',
    properties: ['openFile'],
    filters: [
      { name: 'Audio Files', extensions: ['wav', 'mp3', 'ogg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  const source = result.filePaths[0]
  if (result.canceled || !source) return null

  const extension = extname(source).toLowerCase()
  if (!audioExtensions.has(extension)) throw new Error('Unsupported audio format')
  const name = basename(descriptor).replace(/\.sound\.gmx$/i, '')
  const data = `${name}${extension}`
  const targetFolder = join(dirname(descriptor), 'audio')
  const target = join(targetFolder, data)
  if (!inside(projectFolder, target)) throw new Error('Invalid sound destination')

  await mkdir(targetFolder, { recursive: true })
  const sameFile = process.platform === 'win32'
    ? resolve(source).toLowerCase() === resolve(target).toLowerCase()
    : resolve(source) === resolve(target)
  if (!sameFile) await copyFile(source, target)

  const audio = relative(projectFolder, target).replace(/\\/g, '/')
  return {
    kind: extension === '.wav' ? 0 : 3,
    extension,
    originName: audio.replace(/\//g, '\\'),
    data,
    audio
  }
})

ipcMain.handle('sound:open', async (_event, file: unknown): Promise<string> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(projectFolder, ...file.replace(/\\/g, '/').split('/').filter(Boolean))
  if (!inside(projectFolder, path) || !audioExtensions.has(extname(path).toLowerCase())) {
    throw new Error('Invalid sound path')
  }
  return shell.openPath(path)
})

ipcMain.handle(
  'background:save',
  async (_event, file: unknown, background: unknown): Promise<void> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const path = resolve(file)
    if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.background.gmx')) {
      throw new Error('Invalid background path')
    }
    await saveBackground(path, background)
  }
)

ipcMain.handle(
  'background:replace',
  async (_event, file: unknown): Promise<BackgroundFile | null> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const descriptor = resolve(file)
    if (!inside(projectFolder, descriptor) || !descriptor.toLowerCase().endsWith('.background.gmx')) {
      throw new Error('Invalid background path')
    }

    const window = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!window) return null
    const result = await dialog.showOpenDialog(window, {
      title: 'Load Background',
      properties: ['openFile'],
      filters: [
        { name: 'PNG Images', extensions: ['png'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    const source = result.filePaths[0]
    if (result.canceled || !source) return null
    if (extname(source).toLowerCase() !== '.png') throw new Error('Unsupported image format')

    const size = await pngSize(source)
    const name = basename(descriptor).replace(/\.background\.gmx$/i, '')
    const targetFolder = join(dirname(descriptor), 'images')
    const target = join(targetFolder, `${name}.png`)
    if (!inside(projectFolder, target)) throw new Error('Invalid background destination')

    await mkdir(targetFolder, { recursive: true })
    const sameFile = process.platform === 'win32'
      ? resolve(source).toLowerCase() === resolve(target).toLowerCase()
      : resolve(source) === resolve(target)
    if (!sameFile) await copyFile(source, target)

    return {
      ...size,
      data: `images\\${name}.png`,
      image: relative(projectFolder, target).replace(/\\/g, '/')
    }
  }
)

ipcMain.handle(
  'background:paste',
  async (_event, file: unknown): Promise<BackgroundFile | null> => {
    if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
    const descriptor = resolve(file)
    if (!inside(projectFolder, descriptor) || !descriptor.toLowerCase().endsWith('.background.gmx')) {
      throw new Error('Invalid background path')
    }
    const image = clipboardImage()
    if (!image) return null

    const name = basename(descriptor).replace(/\.background\.gmx$/i, '')
    const targetFolder = join(dirname(descriptor), 'images')
    const target = join(targetFolder, `${name}.png`)
    if (!inside(projectFolder, target)) throw new Error('Invalid background destination')
    await mkdir(targetFolder, { recursive: true })
    await writeFile(target, image.png)
    return {
      width: image.width,
      height: image.height,
      data: `images\\${name}.png`,
      image: relative(projectFolder, target).replace(/\\/g, '/')
    }
  }
)

ipcMain.handle(
  'background:image-save',
  async (_event, name: unknown, image: unknown): Promise<string | null> => {
    if (!projectFolder || typeof name !== 'string' || typeof image !== 'string') {
      throw new Error('No background image is available')
    }
    const source = resolve(projectFolder, ...image.replace(/\\/g, '/').split('/').filter(Boolean))
    if (!inside(projectFolder, source) || extname(source).toLowerCase() !== '.png') {
      throw new Error('Invalid background image path')
    }
    const info = await stat(source)
    if (!info.isFile()) throw new Error('Background image does not exist')

    const window = BrowserWindow.getFocusedWindow() ?? mainWindow
    if (!window) return null
    const stem = basename(name).replace(/\.png$/i, '').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'background'
    const result = await dialog.showSaveDialog(window, {
      title: 'Save Background Image',
      defaultPath: `${stem}.png`,
      filters: [{ name: 'PNG Image', extensions: ['png'] }]
    })
    if (result.canceled || !result.filePath) return null
    const sameFile = process.platform === 'win32'
      ? resolve(source).toLowerCase() === resolve(result.filePath).toLowerCase()
      : resolve(source) === resolve(result.filePath)
    if (!sameFile) await copyFile(source, result.filePath)
    return result.filePath
  }
)

ipcMain.handle('font:save', async (
  _event,
  file: unknown,
  font: unknown,
  atlas: unknown
): Promise<void> => {
  if (!projectFolder || typeof file !== 'string') throw new Error('No project is open')
  const path = resolve(file)
  if (!inside(projectFolder, path) || !path.toLowerCase().endsWith('.font.gmx')) {
    throw new Error('Invalid font path')
  }
  await saveFont(path, font, atlas)
})

ipcMain.handle('font:list', (): Promise<string[]> => listFonts())

ipcMain.handle('font:ranges-code', async (): Promise<FontRange[]> => {
  if (!projectFolder) throw new Error('No project is open')
  return rangesFromCode(projectFolder)
})

ipcMain.handle('font:ranges-file', async (): Promise<FontRange[] | null> => {
  if (!projectFolder) throw new Error('No project is open')
  const window = BrowserWindow.getFocusedWindow() ?? mainWindow
  if (!window) return null
  const result = await dialog.showOpenDialog(window, {
    title: 'Add Font Range from File',
    properties: ['openFile'],
    filters: [
      { name: 'Text and Source Files', extensions: ['txt', 'gml', 'csv', 'json', 'xml'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  const file = result.filePaths[0]
  if (result.canceled || !file) return null
  const info = await stat(file)
  if (!info.isFile() || info.size > 4 * 1024 * 1024) throw new Error('Text file is too large')
  return rangesFromText(await readFile(file, 'utf8'))
})

ipcMain.handle('image:save', async (_event, file: unknown, dataUrl: unknown): Promise<void> => {
  if (!projectFolder || typeof file !== 'string' || typeof dataUrl !== 'string') {
    throw new Error('Invalid image data')
  }

  const path = resolve(projectFolder, ...file.replace(/\\/g, '/').split('/').filter(Boolean))
  if (!inside(projectFolder, path) || extname(path).toLowerCase() !== '.png') {
    throw new Error('Invalid image path')
  }

  const data = pngData(dataUrl, 48 * 1024 * 1024)
  await writeFile(path, data)
})

ipcMain.on('window:title', (event, title: unknown) => {
  if (typeof title !== 'string') return
  BrowserWindow.fromWebContents(event.sender)?.setTitle(title.slice(0, 260))
})

ipcMain.on('window:dirty-count', (event, count: unknown) => {
  if (BrowserWindow.fromWebContents(event.sender) !== mainWindow) return
  dirtyCount = typeof count === 'number' && Number.isFinite(count)
    ? Math.max(0, Math.min(10000, Math.round(count)))
    : 0
})

ipcMain.on('window:finish-close', (event, result: unknown) => {
  const window = BrowserWindow.fromWebContents(event.sender)
  if (!window || window !== mainWindow || !closePromptOpen) return

  if (result === 'saved') {
    allowWindowClose = true
    window.close()
    return
  }

  closePromptOpen = false
  if (result === 'cancelled') return

  void dialog.showMessageBox(window, {
    type: 'error',
    title: 'Could Not Save',
    message: 'Some resources could not be saved.',
    detail: 'The project remains open. Check Output for details and try again.',
    buttons: ['OK']
  })
})

app.whenReady().then(() => {
  app.setAppUserModelId('dev.opengms.editor')
  Menu.setApplicationMenu(null)
  const webSession = legacyPrefs
    ? session.defaultSession
    : session.fromPartition(`opengms-${process.pid}`, { cache: false })
  void webSession.protocol.handle('opengms', openAsset)
  createWindow(webSession)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(webSession)
  })
})

app.on('before-quit', (event) => {
  const temp = projectTempRoot
  if ((!builds.busy && !temp) || preparingQuit) return
  event.preventDefault()
  preparingQuit = true
  projectTempRoot = null
  void Promise.all([
    builds.stop(),
    temp ? removeTempProject(temp) : Promise.resolve()
  ]).finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
