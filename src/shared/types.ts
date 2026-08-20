export type ProjectFormat = 'gmx'

export type CodeFile = {
  text: string
  bom: boolean
  eol: 'lf' | 'crlf'
}

export type ScriptInfo = {
  signature: string
  description: string
}

export type ActionArg = {
  kind: number
  value: string
}

export type ObjectAction = {
  libId: number
  id: number
  kind: number
  canRelative: boolean
  question: boolean
  canApply: boolean
  execType: number
  functionName: string
  code: string
  appliesTo: string
  relative: boolean
  not: boolean
  args: ActionArg[]
}

export type ObjectEvent = {
  type: number
  number: number
  target: string
  actions: ObjectAction[]
}

export type ObjectPhysics = {
  enabled: boolean
  sensor: boolean
  shape: number
  density: number
  restitution: number
  group: number
  linearDamping: number
  angularDamping: number
  friction: number
  awake: boolean
  kinematic: boolean
  points: Array<{ x: number; y: number }>
}

export type ObjectData = {
  sprite: string
  solid: boolean
  visible: boolean
  depth: number
  persistent: boolean
  parent: string
  mask: string
  events: ObjectEvent[]
  physics: ObjectPhysics
}

export type TimelineMoment = {
  step: number
  actions: ObjectAction[]
}

export type TimelineData = {
  moments: TimelineMoment[]
}

export type PathPoint = {
  x: number
  y: number
  speed: number
}

export type PathData = {
  kind: 0 | 1
  closed: boolean
  precision: number
  backgroundRoom: number
  snapX: number
  snapY: number
  points: PathPoint[]
}

export type RoomBackground = {
  visible: boolean
  foreground: boolean
  name: string
  x: number
  y: number
  tileX: boolean
  tileY: boolean
  speedX: number
  speedY: number
  stretch: boolean
}

export type RoomView = {
  visible: boolean
  object: string
  x: number
  y: number
  width: number
  height: number
  portX: number
  portY: number
  portWidth: number
  portHeight: number
  borderX: number
  borderY: number
  speedX: number
  speedY: number
}

export type RoomInstance = {
  object: string
  x: number
  y: number
  name: string
  locked: boolean
  code: string
  scaleX: number
  scaleY: number
  color: number
  rotation: number
  extra: Record<string, string>
}

export type RoomTile = {
  background: string
  x: number
  y: number
  width: number
  height: number
  sourceX: number
  sourceY: number
  id: number
  name: string
  depth: number
  locked: boolean
  color: number
  scaleX: number
  scaleY: number
}

export type RoomPhysics = {
  enabled: boolean
  top: number
  left: number
  right: number
  bottom: number
  gravityX: number
  gravityY: number
  pixelsToMeters: number
}

export type RoomData = {
  caption: string
  width: number
  height: number
  snapX: number
  snapY: number
  isometric: boolean
  speed: number
  persistent: boolean
  color: number
  showColor: boolean
  code: string
  enableViews: boolean
  clearViewBackground: boolean
  clearDisplayBuffer: boolean
  backgrounds: RoomBackground[]
  views: RoomView[]
  instances: RoomInstance[]
  tiles: RoomTile[]
  physics: RoomPhysics
}

export type ActionArgInfo = {
  caption: string
  kind: number
  defaultValue: string
  menu: string[]
}

export type ActionInfo = {
  libraryId: number
  id: number
  name: string
  description: string
  listText: string
  hintText: string
  kind: number
  interfaceKind: number
  question: boolean
  canApply: boolean
  canRelative: boolean
  execType: number
  execInfo: string
  args: ActionArgInfo[]
  icon?: string
}

export type ActionLibrary = {
  id: number
  name: string
  advanced: boolean
  actions: ActionInfo[]
}

export type SpriteBoxMode = 'auto' | 'full' | 'manual'
export type SpriteShape = 'precise' | 'rectangle' | 'ellipse' | 'diamond'
export type SoundMode = 'uncompressed' | 'compressed' | 'decompress' | 'streamed'
export type ShaderType = 'GLSLES' | 'GLSL' | 'HLSL9' | 'HLSL11'

export type SpriteFrame = {
  index: number
  image?: string
  missing: boolean
}

export type SpriteData = {
  width: number
  height: number
  xOrigin: number
  yOrigin: number
  shape: SpriteShape
  tolerance: number
  separateMasks: boolean
  boxMode: SpriteBoxMode
  box: {
    left: number
    right: number
    top: number
    bottom: number
  }
  tileX: boolean
  tileY: boolean
  for3D: boolean
  textureGroup: string
  frames: SpriteFrame[]
}

export type StripImage = {
  name: string
  dataUrl: string
  width: number
  height: number
}

export type SpriteFramesFile = {
  width: number
  height: number
  frames: SpriteFrame[]
}

export type SoundData = {
  kind: number
  mode: SoundMode
  extension: string
  originName: string
  data: string
  audio?: string
  missing: boolean
  volume: number
  bitRate: number
  sampleRate: number
  stereo: boolean
  bitDepth: number
  audioGroup: number
}

export type ShaderData = {
  type: ShaderType
  vertex: string
  fragment: string
  bom: boolean
  eol: 'lf' | 'crlf'
}

export type ExtensionFramework = {
  name: string
  weak: boolean
  tag: string
}

export type ExtensionResource = {
  type: ResourceType
  path: string
  tag: string
}

export type ExtensionProxy = {
  name: string
  targetMask: string
}

export type ExtensionFunction = {
  name: string
  externalName: string
  kind: number
  help: string
  returnType: number
  argCount: number
  args: number[]
}

export type ExtensionFile = {
  filename: string
  originalName: string
  init: string
  final: string
  kind: number
  uncompress: boolean
  copyMasks: Record<string, string>
  proxyFiles: ExtensionProxy[]
  functions: ExtensionFunction[]
}

export type MacroEntry = {
  name: string
  value: string
}

export type MacroData = {
  config: string | null
  entries: MacroEntry[]
}

export type GameInfoAlign = 'left' | 'center' | 'right' | 'justify'

export type GameInfoRun = {
  text: string
  font?: string
  size?: number
  color?: string
  background?: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  strike?: boolean
}

export type GameInfoParagraph = {
  align: GameInfoAlign
  list: 'bullet' | 'number' | null
  runs: GameInfoRun[]
}

export type GameInfoData = {
  paragraphs: GameInfoParagraph[]
}

export type ExtensionData = {
  name: string
  version: [number, number, number]
  copyMasks: Record<string, string>
  className: string
  compilerFlags: string
  linkerFlags: string
  plist: string
  systemFrameworks: ExtensionFramework[]
  thirdPartyFrameworks: ExtensionFramework[]
  androidClassName: string
  permissions: string[]
  androidManifest: string
  androidApplication: string
  androidActivity: string
  gradle: string
  includedResources: ExtensionResource[]
  files: ExtensionFile[]
}

export type BackgroundData = {
  width: number
  height: number
  data: string
  image?: string
  missing: boolean
  tileSet: boolean
  tileWidth: number
  tileHeight: number
  tileXOffset: number
  tileYOffset: number
  tileHSeparation: number
  tileVSeparation: number
  tileX: boolean
  tileY: boolean
  for3D: boolean
  textureGroup: string
}

export type BackgroundFile = {
  width: number
  height: number
  data: string
  image: string
}

export type FontRange = {
  start: number
  end: number
}

export type FontData = {
  font: string
  size: number
  bold: boolean
  italic: boolean
  highQuality: boolean
  antiAlias: number
  charset: number
  includeTtf: boolean
  ttfName: string
  textureGroup: string
  ranges: FontRange[]
  baked: boolean
}

export type FontGlyph = {
  character: number
  x: number
  y: number
  width: number
  height: number
  shift: number
  offset: number
}

export type FontAtlas = {
  png: string
  width: number
  height: number
  glyphs: FontGlyph[]
}

export type SoundFile = {
  kind: number
  extension: string
  originName: string
  data: string
  audio: string
}

export type ResourceType =
  | 'sprite'
  | 'sound'
  | 'background'
  | 'path'
  | 'script'
  | 'shader'
  | 'font'
  | 'timeline'
  | 'object'
  | 'room'
  | 'file'
  | 'extension'
  | 'macro'

export type MediaImportType = 'sprite' | 'background' | 'sound' | 'file'

export type ProjectItem =
  | {
      id: string
      kind: 'group'
      type: ResourceType
      name: string
      items: ProjectItem[]
    }
  | {
      id: string
      kind: 'resource'
      type: ResourceType
      name: string
      path: string
      file: string
      missing: boolean
      image?: string
      sprite?: SpriteData
      sound?: SoundData
      background?: BackgroundData
      font?: FontData
      object?: ObjectData
      timeline?: TimelineData
      pathData?: PathData
      room?: RoomData
      script?: ScriptInfo
      shaderType?: ShaderType
      shader?: ShaderData
      extension?: ExtensionData
      macro?: MacroData
    }

export type ProjectGroup = {
  type: ResourceType
  name: string
  count: number
  items: ProjectItem[]
}

export type ResourceTreeRef = {
  type: ResourceType
  kind: 'root' | 'group' | 'resource'
  groupPath: string[]
  path?: string
}

export type ResourceDropPosition = 'inside' | 'before' | 'after'

export type ResourceReference = {
  file: string
  line: number
  text: string
}

export type Project = {
  format: ProjectFormat
  path: string
  folder: string
  name: string
  untitled?: boolean
  gameInfoFile: string
  configs: string[]
  audioGroups: string[]
  groups: ProjectGroup[]
  total: number
  missing: number
}

export type GlobalResourceRef = {
  type: 'sprite' | 'background' | 'font' | 'sound'
  name: string
}

export type TextureGroupSettings = {
  sourceIndex: number | null
  name: string
  scaled: boolean
  noCropping: boolean
  border: number
  parent: string
  targets: string
  contents: GlobalResourceRef[]
}

export type AudioGroupSettings = {
  sourceIndex: number | null
  name: string
  targets: string
  contents: GlobalResourceRef[]
}

export type GlobalGeneralSettings = {
  gameId: number
  guid: string
  windowColor: string
  useNewAudio: boolean
  shortCircuit: boolean
  fastCollision: boolean
  collisionCompatibility: boolean
}

export type GlobalProjectInfo = {
  author: string
  version: string
  lastChanged: string
  information: string
}

export type WindowsSettings = {
  displayName: string
  version: [number, number, number, number]
  company: string
  product: string
  copyright: string
  description: string
  showCursor: boolean
  gameIcon: string
  saveLocation: number
  sleepMargin: number
  splashScreen: string
  useSplash: boolean
  fullscreen: boolean
  interpolate: boolean
  sizable: boolean
  keepAspect: boolean
  allowFullscreen: boolean
  borderless: boolean
  syncVertex: boolean
  createTexturesOnDemand: boolean
  vertexBufferMethod: number
  alternateSyncMethod: boolean
  texturePage: number
  runnerFinished: string
  runnerHeader: string
  installerScript: string
  license: string
}

export type GlobalSettingsData = {
  config: string
  general: GlobalGeneralSettings
  textureGroups: TextureGroupSettings[]
  audioGroups: AudioGroupSettings[]
  projectInfo: GlobalProjectInfo
  windows: WindowsSettings
}

export type UnsavedChoice = 'save' | 'discard' | 'cancel'
export type CloseSaveResult = 'saved' | 'cancelled' | 'failed'

export type BuildMode = 'build' | 'run' | 'clean'

export type BuildPhase = 'idle' | 'building' | 'running' | 'cleaning' | 'stopping'

export type BuildState = {
  phase: BuildPhase
  mode: BuildMode | null
}

export type BuildOutput = {
  stream: 'stdout' | 'stderr' | 'system'
  text: string
}

export type PrefKey = 'editor' | 'layout' | 'recentProjects' | 'recentColors' | 'dialogFolders' | 'codeDialogs'

export type Prefs = Partial<Record<PrefKey, unknown>>

export type OpenGmsApi = {
  initPrefs: (legacy: Prefs) => Promise<Prefs>
  setPref: (key: PrefKey, value: unknown) => Promise<void>
  removePref: (key: PrefKey) => Promise<void>
  startProject: () => Promise<Project | null>
  newProject: () => Promise<Project | null>
  openProject: () => Promise<Project | null>
  openProjectFile: (file: string) => Promise<Project>
  saveProjectAs: () => Promise<Project | null>
  revealProjectFolder: () => Promise<void>
  getBuildState: () => Promise<BuildState>
  buildProject: (config: string) => Promise<BuildState>
  runProject: (config: string) => Promise<BuildState>
  cleanProject: () => Promise<BuildState>
  stopProject: () => Promise<BuildState>
  onBuildState: (callback: (state: BuildState) => void) => () => void
  onBuildOutput: (callback: (output: BuildOutput) => void) => () => void
  readScript: (file: string) => Promise<CodeFile>
  saveScript: (file: string, code: CodeFile) => Promise<void>
  loadActions: () => Promise<ActionLibrary[]>
  saveObject: (file: string, object: ObjectData) => Promise<void>
  saveTimeline: (file: string, timeline: TimelineData) => Promise<void>
  savePath: (file: string, path: PathData) => Promise<void>
  readRoom: (file: string) => Promise<RoomData>
  saveRoom: (file: string, room: RoomData) => Promise<void>
  saveExtension: (file: string, extension: ExtensionData) => Promise<void>
  saveExtensionFile: (file: string, index: number, data: ExtensionFile) => Promise<void>
  saveExtensionFunction: (
    file: string,
    fileIndex: number,
    functionIndex: number,
    data: ExtensionFunction
  ) => Promise<void>
  saveMacros: (file: string, macros: MacroData) => Promise<void>
  addConfig: (name: string, base?: string) => Promise<Project>
  renameConfig: (name: string, nextName: string) => Promise<Project>
  deleteConfig: (name: string) => Promise<Project>
  readGameInfo: () => Promise<GameInfoData>
  saveGameInfo: (data: GameInfoData) => Promise<void>
  readGlobalSettings: (config: string) => Promise<GlobalSettingsData>
  saveGlobalSettings: (config: string, data: GlobalSettingsData) => Promise<Project>
  createResource: (type: ResourceType, groupPath: string[]) => Promise<Project>
  addExistingResource: (type: ResourceType, groupPath: string[]) => Promise<Project | null>
  getDroppedFilePath: (file: File) => string
  importMedia: (file: string, type: MediaImportType) => Promise<Project>
  duplicateResource: (ref: ResourceTreeRef) => Promise<Project>
  createResourceGroup: (type: ResourceType, groupPath: string[]) => Promise<Project>
  sortResourceGroup: (type: ResourceType, groupPath: string[]) => Promise<Project>
  deleteResourceItem: (ref: ResourceTreeRef) => Promise<Project>
  renameResourceItem: (ref: ResourceTreeRef, name: string) => Promise<Project>
  moveResourceItem: (
    source: ResourceTreeRef,
    target: ResourceTreeRef,
    position: ResourceDropPosition
  ) => Promise<Project>
  revealResourceItem: (ref: ResourceTreeRef) => Promise<void>
  openExternalResource: (ref: ResourceTreeRef) => Promise<string>
  checkResourceReferences: (ref: ResourceTreeRef) => Promise<ResourceReference[]>
  saveShader: (file: string, shader: ShaderData) => Promise<void>
  saveSprite: (file: string, sprite: SpriteData) => Promise<void>
  openSpriteImages: () => Promise<StripImage[] | null>
  pasteSpriteImage: (file: string) => Promise<SpriteFramesFile | null>
  openSpriteStrip: () => Promise<StripImage | null>
  writeSpriteFrames: (file: string, images: string[]) => Promise<SpriteFramesFile>
  saveSpriteStrip: (name: string, dataUrl: string) => Promise<string | null>
  saveImage: (path: string, dataUrl: string) => Promise<void>
  saveSound: (file: string, sound: SoundData) => Promise<void>
  replaceSound: (file: string) => Promise<SoundFile | null>
  openSound: (path: string) => Promise<string>
  saveBackground: (file: string, background: BackgroundData) => Promise<void>
  replaceBackground: (file: string) => Promise<BackgroundFile | null>
  pasteBackgroundImage: (file: string) => Promise<BackgroundFile | null>
  saveBackgroundImage: (name: string, image: string) => Promise<string | null>
  saveFont: (file: string, font: FontData, atlas: FontAtlas) => Promise<void>
  listFonts: () => Promise<string[]>
  fontRangesFromCode: () => Promise<FontRange[]>
  fontRangesFromFile: () => Promise<FontRange[] | null>
  confirmUnsaved: (title: string, count: number, all?: boolean) => Promise<UnsavedChoice>
  setDirtyCount: (count: number) => void
  onSaveAndClose: (callback: () => void) => () => void
  finishClose: (result: CloseSaveResult) => void
  setTitle: (title: string) => void
}
