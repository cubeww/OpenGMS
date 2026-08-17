import { contextBridge, ipcRenderer, webUtils } from 'electron'
import type {
  BuildOutput,
  BuildState,
  CodeFile,
  OpenGmsApi,
  Project,
  RoomData
} from '../shared/types'

const api: OpenGmsApi = {
  startProject: () => ipcRenderer.invoke('project:start') as Promise<Project | null>,
  newProject: () => ipcRenderer.invoke('project:new') as Promise<Project | null>,
  openProject: () => ipcRenderer.invoke('project:open') as Promise<Project | null>,
  openProjectFile: (file) => ipcRenderer.invoke('project:open-file', file) as Promise<Project>,
  saveProjectAs: () => ipcRenderer.invoke('project:save-as') as Promise<Project | null>,
  revealProjectFolder: () => ipcRenderer.invoke('project:reveal') as Promise<void>,
  getBuildState: () => ipcRenderer.invoke('build:state') as Promise<BuildState>,
  buildProject: (config) => ipcRenderer.invoke('build:start', 'build', config) as Promise<BuildState>,
  runProject: (config) => ipcRenderer.invoke('build:start', 'run', config) as Promise<BuildState>,
  cleanProject: () => ipcRenderer.invoke('build:clean') as Promise<BuildState>,
  stopProject: () => ipcRenderer.invoke('build:stop') as Promise<BuildState>,
  onBuildState: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, state: BuildState): void => callback(state)
    ipcRenderer.on('build:state', listener)
    return () => ipcRenderer.removeListener('build:state', listener)
  },
  onBuildOutput: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, output: BuildOutput): void => callback(output)
    ipcRenderer.on('build:output', listener)
    return () => ipcRenderer.removeListener('build:output', listener)
  },
  readScript: (file) => ipcRenderer.invoke('script:read', file) as Promise<CodeFile>,
  saveScript: (file, code) => ipcRenderer.invoke('script:save', file, code) as Promise<void>,
  loadActions: () => ipcRenderer.invoke('actions:load'),
  saveObject: (file, object) => ipcRenderer.invoke('object:save', file, object) as Promise<void>,
  saveTimeline: (file, timeline) => ipcRenderer.invoke('timeline:save', file, timeline) as Promise<void>,
  savePath: (file, path) => ipcRenderer.invoke('path:save', file, path) as Promise<void>,
  readRoom: (file) => ipcRenderer.invoke('room:read', file) as Promise<RoomData>,
  saveRoom: (file, room) => ipcRenderer.invoke('room:save', file, room) as Promise<void>,
  saveExtension: (file, extension) =>
    ipcRenderer.invoke('extension:save', file, extension) as Promise<void>,
  saveExtensionFile: (file, index, data) =>
    ipcRenderer.invoke('extension:file-save', file, index, data) as Promise<void>,
  saveExtensionFunction: (file, fileIndex, functionIndex, data) =>
    ipcRenderer.invoke('extension:function-save', file, fileIndex, functionIndex, data) as Promise<void>,
  saveMacros: (file, macros) => ipcRenderer.invoke('macro:save', file, macros) as Promise<void>,
  addConfig: (name, base) => ipcRenderer.invoke('config:add', name, base) as Promise<Project>,
  renameConfig: (name, nextName) =>
    ipcRenderer.invoke('config:rename', name, nextName) as Promise<Project>,
  deleteConfig: (name) => ipcRenderer.invoke('config:delete', name) as Promise<Project>,
  readGameInfo: () => ipcRenderer.invoke('game-info:read'),
  saveGameInfo: (data) => ipcRenderer.invoke('game-info:save', data) as Promise<void>,
  readGlobalSettings: (config) => ipcRenderer.invoke('global-settings:read', config),
  saveGlobalSettings: (config, data) =>
    ipcRenderer.invoke('global-settings:save', config, data) as Promise<Project>,
  createResource: (type, groupPath) =>
    ipcRenderer.invoke('resource:create', type, groupPath) as Promise<Project>,
  addExistingResource: (type, groupPath) =>
    ipcRenderer.invoke('resource:add-existing', type, groupPath) as Promise<Project | null>,
  getDroppedFilePath: (file) => webUtils.getPathForFile(file),
  importMedia: (file, type) =>
    ipcRenderer.invoke('resource:import-media', file, type) as Promise<Project>,
  duplicateResource: (ref) => ipcRenderer.invoke('resource:duplicate', ref) as Promise<Project>,
  createResourceGroup: (type, groupPath) =>
    ipcRenderer.invoke('resource:create-group', type, groupPath) as Promise<Project>,
  sortResourceGroup: (type, groupPath) =>
    ipcRenderer.invoke('resource:sort', type, groupPath) as Promise<Project>,
  deleteResourceItem: (ref) => ipcRenderer.invoke('resource:delete', ref) as Promise<Project>,
  renameResourceItem: (ref, name) =>
    ipcRenderer.invoke('resource:rename', ref, name) as Promise<Project>,
  moveResourceItem: (source, target, position) =>
    ipcRenderer.invoke('resource:move', source, target, position) as Promise<Project>,
  revealResourceItem: (ref) => ipcRenderer.invoke('resource:reveal', ref) as Promise<void>,
  openExternalResource: (ref) =>
    ipcRenderer.invoke('resource:open-external', ref) as Promise<string>,
  checkResourceReferences: (ref) => ipcRenderer.invoke('resource:references', ref),
  saveShader: (file, shader) => ipcRenderer.invoke('shader:save', file, shader) as Promise<void>,
  saveSprite: (file, sprite) => ipcRenderer.invoke('sprite:save', file, sprite) as Promise<void>,
  openSpriteStrip: () => ipcRenderer.invoke('sprite:strip-open'),
  writeSpriteFrames: (file, images) => ipcRenderer.invoke('sprite:frames-write', file, images),
  saveSpriteStrip: (name, dataUrl) =>
    ipcRenderer.invoke('sprite:strip-save', name, dataUrl) as Promise<string | null>,
  saveImage: (path, dataUrl) => ipcRenderer.invoke('image:save', path, dataUrl) as Promise<void>,
  saveSound: (file, sound) => ipcRenderer.invoke('sound:save', file, sound) as Promise<void>,
  replaceSound: (file) => ipcRenderer.invoke('sound:replace', file),
  openSound: (path) => ipcRenderer.invoke('sound:open', path) as Promise<string>,
  saveBackground: (file, background) =>
    ipcRenderer.invoke('background:save', file, background) as Promise<void>,
  replaceBackground: (file) => ipcRenderer.invoke('background:replace', file),
  saveFont: (file, font, atlas) =>
    ipcRenderer.invoke('font:save', file, font, atlas) as Promise<void>,
  listFonts: () => ipcRenderer.invoke('font:list') as Promise<string[]>,
  fontRangesFromCode: () => ipcRenderer.invoke('font:ranges-code'),
  fontRangesFromFile: () => ipcRenderer.invoke('font:ranges-file'),
  confirmUnsaved: (title, count, all = false) =>
    ipcRenderer.invoke('window:confirm-unsaved', title, count, all),
  setDirtyCount: (count) => ipcRenderer.send('window:dirty-count', count),
  onSaveAndClose: (callback) => {
    const listener = (): void => callback()
    ipcRenderer.on('window:save-and-close', listener)
    return () => ipcRenderer.removeListener('window:save-and-close', listener)
  },
  finishClose: (result) => ipcRenderer.send('window:finish-close', result),
  setTitle: (title) => ipcRenderer.send('window:title', title)
}

contextBridge.exposeInMainWorld('openGms', api)
