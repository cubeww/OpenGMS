import { existsSync } from 'node:fs'
import {
  cp,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  stat,
  writeFile
} from 'node:fs/promises'
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve
} from 'node:path'
import { DOMParser } from '@xmldom/xmldom'
import type {
  ResourceDropPosition,
  ResourceReference,
  ResourceTreeRef,
  ResourceType
} from '../shared/types'
import { withGmezDescriptor } from './gmez'

type XmlDoc = ReturnType<DOMParser['parseFromString']>
type XmlElement = NonNullable<XmlDoc['documentElement']>

type Spec = {
  type: Exclude<ResourceType, 'macro'>
  mode: 'standard' | 'files' | 'extensions'
  section: string
  item: string
  folder: string
  extension: string
  base: string
  rootName?: string
}

type DataFile = {
  name: string
  filename: string
  exists: string
  size: string
  exportAction: string
  exportDir: string
  overwrite: string
  freeData: string
  removeEnd: string
  store: string
  configs: Array<{ name: string; mask: string }>
}

type ResourceNode = {
  kind: 'resource'
  value: string
  attrs: Record<string, string>
  data?: DataFile
}

type GroupNode = {
  kind: 'group'
  name: string
  items: TreeNode[]
}

type TreeNode = ResourceNode | GroupNode

type ProjectTree = {
  file: string
  folder: string
  source: string
  eol: string
  spec: Spec
  sectionTag: string
  configs: string[]
  items: TreeNode[]
}

const specs: Partial<Record<ResourceType, Spec>> = {
  sprite: { type: 'sprite', mode: 'standard', section: 'sprites', item: 'sprite', folder: 'sprites', extension: '.sprite.gmx', base: 'sprite', rootName: 'sprites' },
  sound: { type: 'sound', mode: 'standard', section: 'sounds', item: 'sound', folder: 'sound', extension: '.sound.gmx', base: 'sound', rootName: 'sound' },
  background: { type: 'background', mode: 'standard', section: 'backgrounds', item: 'background', folder: 'background', extension: '.background.gmx', base: 'background', rootName: 'backgrounds' },
  path: { type: 'path', mode: 'standard', section: 'paths', item: 'path', folder: 'paths', extension: '.path.gmx', base: 'path', rootName: 'paths' },
  script: { type: 'script', mode: 'standard', section: 'scripts', item: 'script', folder: 'scripts', extension: '.gml', base: 'script', rootName: 'scripts' },
  shader: { type: 'shader', mode: 'standard', section: 'shaders', item: 'shader', folder: 'shaders', extension: '.shader', base: 'shader', rootName: 'shaders' },
  font: { type: 'font', mode: 'standard', section: 'fonts', item: 'font', folder: 'fonts', extension: '.font.gmx', base: 'font', rootName: 'fonts' },
  timeline: { type: 'timeline', mode: 'standard', section: 'timelines', item: 'timeline', folder: 'timelines', extension: '.timeline.gmx', base: 'timeline', rootName: 'timelines' },
  object: { type: 'object', mode: 'standard', section: 'objects', item: 'object', folder: 'objects', extension: '.object.gmx', base: 'object', rootName: 'objects' },
  room: { type: 'room', mode: 'standard', section: 'rooms', item: 'room', folder: 'rooms', extension: '.room.gmx', base: 'room', rootName: 'rooms' },
  file: { type: 'file', mode: 'files', section: 'datafiles', item: 'datafile', folder: 'datafiles', extension: '', base: 'file', rootName: 'datafiles' },
  extension: { type: 'extension', mode: 'extensions', section: 'NewExtensions', item: 'extension', folder: 'extensions', extension: '.extension.gmx', base: 'extension' }
}

const maxProjectSize = 32 * 1024 * 1024
const maxResourceSize = 128 * 1024 * 1024
const shaderMarker = '//######################_==_YOYO_SHADER_MARKER_==_######################@~'

function specFor(type: ResourceType): Spec {
  const spec = specs[type]
  if (!spec) throw new Error(`${type === 'macro' ? 'Macros' : 'This resource type'} cannot be changed here`)
  return spec
}

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

function child(node: XmlElement, name: string): XmlElement | undefined {
  const wanted = name.toLowerCase()
  return children(node).find((item) => tag(item) === wanted)
}

function text(node: XmlElement | undefined, trim = true): string {
  const value = node?.textContent ?? ''
  return trim ? value.trim() : value
}

function parseXml(source: string, label: string): XmlElement {
  const errors: string[] = []
  const document = new DOMParser({
    onError: (level, message) => {
      if (level !== 'warning') errors.push(message)
    }
  }).parseFromString(source, 'application/xml')
  if (errors.length > 0 || !document.documentElement) {
    throw new Error(`Invalid ${label} XML${errors[0] ? `: ${errors[0]}` : ''}`)
  }
  return document.documentElement
}

function xml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function xmlAttr(value: string): string {
  return xml(value).replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

function cleanPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '')
}

function inside(folder: string, file: string): boolean {
  const path = relative(resolve(folder), resolve(file))
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

function addExtension(value: string, extension: string): string {
  const path = cleanPath(value)
  return extension && !path.toLowerCase().endsWith(extension.toLowerCase())
    ? `${path}${extension}`
    : path
}

function itemName(value: string, extension: string): string {
  const name = basename(cleanPath(value))
  return extension && name.toLowerCase().endsWith(extension.toLowerCase())
    ? name.slice(0, -extension.length)
    : name
}

function attrs(node: XmlElement): Record<string, string> {
  const result: Record<string, string> = {}
  for (let index = 0; index < node.attributes.length; index += 1) {
    const item = node.attributes.item(index)
    if (item) result[item.name] = item.value
  }
  return result
}

function dataFile(node: XmlElement, configs: string[]): DataFile {
  const options = child(node, 'ConfigOptions')
  const masks = options ? children(options).flatMap((item) => {
    if (tag(item) !== 'config') return []
    const name = item.getAttribute('name')?.trim() ?? ''
    return name ? [{ name, mask: text(child(item, 'CopyToMask')) || '9223372036854775807' }] : []
  }) : []
  const names = masks.length > 0 ? masks : configs.map((name) => ({ name, mask: '9223372036854775807' }))
  return {
    name: text(child(node, 'name')) || text(child(node, 'filename')),
    filename: text(child(node, 'filename')) || text(child(node, 'name')),
    exists: text(child(node, 'exists')) || '-1',
    size: text(child(node, 'size')) || '0',
    exportAction: text(child(node, 'exportAction')) || '2',
    exportDir: text(child(node, 'exportDir')),
    overwrite: text(child(node, 'overwrite')) || '0',
    freeData: text(child(node, 'freeData')) || '-1',
    removeEnd: text(child(node, 'removeEnd')) || '0',
    store: text(child(node, 'store')) || '0',
    configs: names
  }
}

function parseStandard(node: XmlElement, spec: Spec): TreeNode[] {
  return children(node).flatMap<TreeNode>((item) => {
    const itemTag = tag(item)
    if (itemTag === spec.section.toLowerCase()) {
      return [{ kind: 'group', name: item.getAttribute('name')?.trim() || 'Group', items: parseStandard(item, spec) }]
    }
    if (itemTag === spec.item) {
      const value = cleanPath(text(item))
      return value ? [{ kind: 'resource', value, attrs: attrs(item) }] : []
    }
    return []
  })
}

function parseFiles(node: XmlElement, spec: Spec, configs: string[]): TreeNode[] {
  return children(node).flatMap<TreeNode>((item) => {
    const itemTag = tag(item)
    if (itemTag === spec.section) {
      return [{ kind: 'group', name: item.getAttribute('name')?.trim() || 'Group', items: parseFiles(item, spec, configs) }]
    }
    if (itemTag === spec.item) {
      const data = dataFile(item, configs)
      return data.filename ? [{ kind: 'resource', value: data.filename, attrs: {}, data }] : []
    }
    return []
  })
}

function parseExtensions(node: XmlElement, spec: Spec): TreeNode[] {
  return children(node).flatMap<TreeNode>((item) => {
    if (tag(item) !== spec.item) return []
    const value = cleanPath(text(item))
    return value ? [{ kind: 'resource', value, attrs: attrs(item) }] : []
  })
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function sectionRange(source: string, name: string): { start: number; end: number; tag: string } | undefined {
  const pattern = new RegExp(`<\\s*(/?)\\s*(${escaped(name)})\\b[^>]*>`, 'gi')
  let depth = 0
  let start = -1
  let actual = name
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    const entry = match[0]
    const closing = Boolean(match[1])
    const selfClosing = /\/\s*>$/.test(entry)
    if (!closing && depth === 0) {
      start = match.index
      actual = match[2]
    }
    if (!closing && !selfClosing) depth += 1
    if (closing) depth -= 1
    if ((selfClosing && depth === 0) || (closing && depth === 0)) {
      return { start, end: pattern.lastIndex, tag: actual }
    }
  }
  return undefined
}

function projectConfigs(root: XmlElement): string[] {
  const section = child(root, 'Configs')
  const result = section ? children(section)
    .filter((item) => tag(item) === 'config')
    .map((item) => itemName(text(item), ''))
    .filter(Boolean) : []
  return result.length > 0 ? result : ['Default']
}

async function loadTree(projectFile: string, type: ResourceType): Promise<ProjectTree> {
  const spec = specFor(type)
  const file = resolve(projectFile)
  const folder = dirname(file)
  const source = await readFile(file, 'utf8')
  if (Buffer.byteLength(source, 'utf8') > maxProjectSize) throw new Error('Project file is too large')
  const root = parseXml(source, 'project')
  if (tag(root) !== 'assets') throw new Error('Invalid GameMaker project')
  const configs = projectConfigs(root)
  const names = spec.mode === 'extensions' ? ['NewExtensions', 'extensions'] : [spec.section]
  const found = names.flatMap((name) => {
    const range = sectionRange(source, name)
    return range ? [range] : []
  })[0]
  let items: TreeNode[] = []
  let sectionTag = found?.tag ?? spec.section
  if (found) {
    const sectionRoot = parseXml(source.slice(found.start, found.end), `${type} section`)
    sectionTag = sectionRoot.nodeName
    items = spec.mode === 'standard'
      ? parseStandard(sectionRoot, spec)
      : spec.mode === 'files'
        ? parseFiles(sectionRoot, spec, configs)
        : parseExtensions(sectionRoot, spec)
  }
  return {
    file,
    folder,
    source,
    eol: source.includes('\r\n') ? '\r\n' : '\n',
    spec,
    sectionTag,
    configs,
    items
  }
}

function resourceCount(items: TreeNode[]): number {
  return items.reduce((total, item) => total + (item.kind === 'group' ? resourceCount(item.items) : 1), 0)
}

function attrSource(values: Record<string, string>): string {
  return Object.entries(values).map(([name, value]) => ` ${name}="${xmlAttr(value)}"`).join('')
}

function standardLines(items: TreeNode[], tree: ProjectTree, depth: number): string[] {
  const indent = '  '.repeat(depth)
  const lines: string[] = []
  for (const item of items) {
    if (item.kind === 'group') {
      lines.push(`${indent}<${tree.spec.section} name="${xmlAttr(item.name)}">`)
      lines.push(...standardLines(item.items, tree, depth + 1))
      lines.push(`${indent}</${tree.spec.section}>`)
    } else {
      const attrs = item.attrs
      const value = tree.spec.type === 'script'
        ? addExtension(item.value, tree.spec.extension)
        : item.value
      lines.push(`${indent}<${tree.spec.item}${attrSource(attrs)}>${xml(value.replace(/\//g, '\\'))}</${tree.spec.item}>`)
    }
  }
  return lines
}

function dataFileLines(data: DataFile, depth: number): string[] {
  const indent = '  '.repeat(depth)
  const line = (name: string, value: string): string => `${indent}  <${name}>${xml(value)}</${name}>`
  const lines = [
    `${indent}<datafile>`,
    line('name', data.name),
    line('exists', data.exists),
    line('size', data.size),
    line('exportAction', data.exportAction),
    line('exportDir', data.exportDir),
    line('overwrite', data.overwrite),
    line('freeData', data.freeData),
    line('removeEnd', data.removeEnd),
    line('store', data.store)
  ]
  if (data.configs.length === 0) {
    lines.push(`${indent}  <ConfigOptions/>`)
  } else {
    lines.push(`${indent}  <ConfigOptions>`)
    for (const config of data.configs) {
      lines.push(`${indent}    <Config name="${xmlAttr(config.name)}">`)
      lines.push(`${indent}      <CopyToMask>${xml(config.mask)}</CopyToMask>`)
      lines.push(`${indent}    </Config>`)
    }
    lines.push(`${indent}  </ConfigOptions>`)
  }
  lines.push(line('filename', data.filename), `${indent}</datafile>`)
  return lines
}

function fileLines(items: TreeNode[], depth: number): string[] {
  const indent = '  '.repeat(depth)
  const lines: string[] = []
  for (const item of items) {
    if (item.kind === 'group') {
      lines.push(`${indent}<datafiles number="${resourceCount(item.items)}" name="${xmlAttr(item.name)}">`)
      lines.push(...fileLines(item.items, depth + 1))
      lines.push(`${indent}</datafiles>`)
    } else if (item.data) {
      lines.push(...dataFileLines(item.data, depth))
    }
  }
  return lines
}

function sectionSource(tree: ProjectTree): string {
  const rootIndent = '  '
  const spec = tree.spec
  if (spec.mode === 'extensions') {
    const lines = [`${rootIndent}<${tree.sectionTag}>`]
    let index = 0
    for (const item of tree.items) {
      if (item.kind !== 'resource') continue
      lines.push(`${rootIndent}  <extension index="${index}">${xml(item.value.replace(/\//g, '\\'))}</extension>`)
      index += 1
    }
    lines.push(`${rootIndent}</${tree.sectionTag}>`)
    return lines.join(tree.eol)
  }
  if (spec.mode === 'files') {
    return [
      `${rootIndent}<datafiles number="${resourceCount(tree.items)}" name="${xmlAttr(spec.rootName ?? 'datafiles')}">`,
      ...fileLines(tree.items, 2),
      `${rootIndent}</datafiles>`
    ].join(tree.eol)
  }
  return [
    `${rootIndent}<${spec.section} name="${xmlAttr(spec.rootName ?? spec.section)}">`,
    ...standardLines(tree.items, tree, 2),
    `${rootIndent}</${spec.section}>`
  ].join(tree.eol)
}

function replaceSection(tree: ProjectTree): string {
  const names = tree.spec.mode === 'extensions' ? ['NewExtensions', 'extensions'] : [tree.spec.section]
  const range = names.flatMap((name) => {
    const value = sectionRange(tree.source, name)
    return value ? [value] : []
  })[0]
  const section = sectionSource(tree)
  let source: string
  if (range) {
    source = `${tree.source.slice(0, range.start)}${section}${tree.source.slice(range.end)}`
  } else {
    const marker = /(^[ \t]*<help\b)/mi
    if (marker.test(tree.source)) {
      source = tree.source.replace(marker, (match) => `${section}${tree.eol}${match}`)
    } else {
      source = tree.source.replace(/(<\/assets>)/i, (match) => `${section}${tree.eol}${match}`)
    }
  }
  parseXml(source, 'project')
  if (Buffer.byteLength(source, 'utf8') > maxProjectSize) throw new Error('Project file is too large')
  return source
}

function groupAt(items: TreeNode[], path: string[]): TreeNode[] {
  let current = items
  for (const name of path) {
    const group = current.find((item): item is GroupNode => item.kind === 'group' && item.name === name)
    if (!group) throw new Error(`Resource group ${name} no longer exists`)
    current = group.items
  }
  return current
}

function resourceAt(items: TreeNode[], ref: ResourceTreeRef): { parent: TreeNode[]; node: ResourceNode; index: number } {
  if (ref.kind !== 'resource' || !ref.path) throw new Error('Invalid resource')
  const parent = groupAt(items, ref.groupPath)
  const wanted = cleanPath(ref.path).toLowerCase()
  const index = parent.findIndex((item) => item.kind === 'resource' && cleanPath(item.value).toLowerCase() === wanted)
  const node = parent[index]
  if (index < 0 || !node || node.kind !== 'resource') throw new Error('Resource no longer exists')
  return { parent, node, index }
}

function groupNode(items: TreeNode[], path: string[]): { parent: TreeNode[]; node: GroupNode; index: number } {
  if (path.length === 0) throw new Error('Top-level resource folders cannot be changed')
  const parent = groupAt(items, path.slice(0, -1))
  const name = path[path.length - 1]
  const index = parent.findIndex((item) => item.kind === 'group' && item.name === name)
  const node = parent[index]
  if (index < 0 || !node || node.kind !== 'group') throw new Error('Resource group no longer exists')
  return { parent, node, index }
}

function nodeName(node: TreeNode, spec: Spec): string {
  return node.kind === 'group'
    ? node.name
    : spec.mode === 'files'
      ? node.data?.name || node.value
      : itemName(node.value, spec.extension)
}

function allNames(items: TreeNode[], spec: Spec): Set<string> {
  const result = new Set<string>()
  function visit(nodes: TreeNode[]): void {
    for (const node of nodes) {
      if (node.kind === 'group') visit(node.items)
      else result.add(nodeName(node, spec).toLowerCase())
    }
  }
  visit(items)
  return result
}

function identifier(value: string): string {
  let result = value.replace(/[^A-Za-z0-9_]/g, '_')
  if (!/^[A-Za-z_]/.test(result)) result = `resource_${result}`
  return result || 'resource'
}

function uniqueName(base: string, names: Set<string>, start = 0): string {
  let index = start
  let name = `${base}${index}`
  while (names.has(name.toLowerCase())) {
    index += 1
    name = `${base}${index}`
  }
  return name
}

function copyName(base: string, names: Set<string>): string {
  let name = `${base}_copy`
  let index = 2
  while (names.has(name.toLowerCase())) {
    name = `${base}_copy${index}`
    index += 1
  }
  return name
}

function resourceValue(spec: Spec, name: string): string {
  const value = `${spec.folder}/${name}`
  return spec.type === 'script' ? addExtension(value, spec.extension) : value
}

function diskFile(tree: ProjectTree, node: ResourceNode, groupPath: string[] = []): string {
  const root = resolve(tree.folder, tree.spec.folder)
  if (tree.spec.mode === 'files') {
    const file = resolve(root, ...groupPath, node.data?.filename || node.value)
    if (!inside(root, file)) throw new Error('Invalid included file path')
    return file
  }
  const file = resolve(tree.folder, ...addExtension(node.value, tree.spec.extension).split('/').filter(Boolean))
  if (!inside(root, file)) throw new Error('Invalid resource path')
  return file
}

function baseTemplate(type: ResourceType, name: string, configs: string[], eol: string): string {
  const comment = '<!--This Document is generated by GameMaker, if you edit it by hand then you do so at your own risk!-->'
  const texture = configs.map((_, index) => `    <TextureGroup${index}>0</TextureGroup${index}>`).join(eol)
  const texgroups = configs.map((_, index) => `    <texgroup${index}>0</texgroup${index}>`).join(eol)
  const configOptions = configs.flatMap((config) => [
    `    <Config name="${xmlAttr(config)}">`,
    '      <CopyToMask>9223372036854775807</CopyToMask>',
    '    </Config>'
  ]).join(eol)
  switch (type) {
    case 'sprite':
      return [comment, '<sprite>', '  <type>0</type>', '  <xorig>0</xorig>', '  <yorigin>0</yorigin>', '  <colkind>0</colkind>', '  <coltolerance>0</coltolerance>', '  <sepmasks>0</sepmasks>', '  <bboxmode>0</bboxmode>', '  <bbox_left>0</bbox_left>', '  <bbox_right>0</bbox_right>', '  <bbox_top>0</bbox_top>', '  <bbox_bottom>0</bbox_bottom>', '  <HTile>0</HTile>', '  <VTile>0</VTile>', '  <TextureGroups>', texture, '  </TextureGroups>', '  <For3D>0</For3D>', '  <width>0</width>', '  <height>0</height>', '  <frames/>', '</sprite>'].join(eol)
    case 'sound':
      return [comment, '<sound>', '  <kind>0</kind>', '  <extension>.wav</extension>', '  <origname></origname>', '  <effects>0</effects>', '  <volume><volume>1</volume></volume>', '  <pan>0</pan>', '  <bitRates><bitRate>192</bitRate></bitRates>', '  <sampleRates><sampleRate>44100</sampleRate></sampleRates>', '  <types><type>0</type></types>', '  <bitDepths><bitDepth>16</bitDepth></bitDepths>', '  <preload>-1</preload>', '  <data></data>', '  <compressed>0</compressed>', '  <streamed>0</streamed>', '  <uncompressOnLoad>0</uncompressOnLoad>', '  <audioGroup>0</audioGroup>', '</sound>'].join(eol)
    case 'background':
      return [comment, '<background>', '  <istileset>0</istileset>', '  <tilewidth>32</tilewidth>', '  <tileheight>32</tileheight>', '  <tilexoff>0</tilexoff>', '  <tileyoff>0</tileyoff>', '  <tilehsep>0</tilehsep>', '  <tilevsep>0</tilevsep>', '  <HTile>0</HTile>', '  <VTile>0</VTile>', '  <TextureGroups>', texture, '  </TextureGroups>', '  <For3D>0</For3D>', '  <width>0</width>', '  <height>0</height>', '  <data></data>', '</background>'].join(eol)
    case 'path':
      return ['<path>', '  <kind>1</kind>', '  <closed>0</closed>', '  <precision>4</precision>', '  <backroom>-1</backroom>', '  <hsnap>32</hsnap>', '  <vsnap>32</vsnap>', '  <points/>', '</path>'].join(eol)
    case 'script':
      return `/// ${name}${eol}`
    case 'shader':
      return [
        '//',
        '// Simple passthrough vertex shader',
        '//',
        'attribute vec3 in_Position;                  // (x,y,z)',
        '//attribute vec3 in_Normal;                  // (x,y,z)     unused in this shader.',
        'attribute vec4 in_Colour;                    // (r,g,b,a)',
        'attribute vec2 in_TextureCoord;              // (u,v)',
        '',
        'varying vec2 v_vTexcoord;',
        'varying vec4 v_vColour;',
        '',
        'void main()',
        '{',
        '    vec4 object_space_pos = vec4( in_Position.x, in_Position.y, in_Position.z, 1.0);',
        '    gl_Position = gm_Matrices[MATRIX_WORLD_VIEW_PROJECTION] * object_space_pos;',
        '    ',
        '    v_vColour = in_Colour;',
        '    v_vTexcoord = in_TextureCoord;',
        '}',
        '',
        `${shaderMarker}//`,
        '// Simple passthrough fragment shader',
        '//',
        'varying vec2 v_vTexcoord;',
        'varying vec4 v_vColour;',
        '',
        'void main()',
        '{',
        '    gl_FragColor = v_vColour * texture2D( gm_BaseTexture, v_vTexcoord );',
        '}',
        '',
        ''
      ].join(eol)
    case 'font':
      return [comment, '<font>', '  <name>Arial</name>', '  <size>12</size>', '  <bold>0</bold>', '  <renderhq>-1</renderhq>', '  <italic>0</italic>', '  <charset>1</charset>', '  <aa>3</aa>', '  <includeTTF>0</includeTTF>', '  <TTFName></TTFName>', '  <texgroups>', texgroups, '  </texgroups>', '  <ranges><range0>32,127</range0></ranges>', '  <glyphs></glyphs>', '  <kerningPairs/>', `  <image>${name}.png</image>`, '</font>'].join(eol)
    case 'timeline':
      return `${comment}${eol}<timeline/>`
    case 'object':
      return [comment, '<object>', '  <spriteName>&lt;undefined&gt;</spriteName>', '  <solid>0</solid>', '  <visible>-1</visible>', '  <depth>0</depth>', '  <persistent>0</persistent>', '  <parentName>&lt;undefined&gt;</parentName>', '  <maskName>&lt;undefined&gt;</maskName>', '  <events/>', '  <PhysicsObject>0</PhysicsObject>', '  <PhysicsObjectSensor>0</PhysicsObjectSensor>', '  <PhysicsObjectShape>0</PhysicsObjectShape>', '  <PhysicsObjectDensity>0.5</PhysicsObjectDensity>', '  <PhysicsObjectRestitution>0.1</PhysicsObjectRestitution>', '  <PhysicsObjectGroup>0</PhysicsObjectGroup>', '  <PhysicsObjectLinearDamping>0.1</PhysicsObjectLinearDamping>', '  <PhysicsObjectAngularDamping>0.1</PhysicsObjectAngularDamping>', '  <PhysicsObjectFriction>0.2</PhysicsObjectFriction>', '  <PhysicsObjectAwake>-1</PhysicsObjectAwake>', '  <PhysicsObjectKinematic>0</PhysicsObjectKinematic>', '  <PhysicsShapePoints/>', '</object>'].join(eol)
    case 'room':
      return [comment, '<room>', '  <caption></caption>', '  <width>640</width>', '  <height>480</height>', '  <vsnap>32</vsnap>', '  <hsnap>32</hsnap>', '  <isometric>0</isometric>', '  <speed>30</speed>', '  <persistent>0</persistent>', '  <colour>12632256</colour>', '  <showcolour>-1</showcolour>', '  <code></code>', '  <enableViews>0</enableViews>', '  <clearViewBackground>-1</clearViewBackground>', '  <clearDisplayBuffer>-1</clearDisplayBuffer>', '  <makerSettings/>', '  <backgrounds/>', '  <views/>', '  <instances/>', '  <tiles/>', '  <PhysicsWorld>0</PhysicsWorld>', '  <PhysicsWorldTop>0</PhysicsWorldTop>', '  <PhysicsWorldLeft>0</PhysicsWorldLeft>', '  <PhysicsWorldRight>1024</PhysicsWorldRight>', '  <PhysicsWorldBottom>768</PhysicsWorldBottom>', '  <PhysicsWorldGravityX>0</PhysicsWorldGravityX>', '  <PhysicsWorldGravityY>10</PhysicsWorldGravityY>', '  <PhysicsWorldPixToMeters>0.1</PhysicsWorldPixToMeters>', '</room>'].join(eol)
    case 'extension':
      return [comment, '<extension>', `  <name>${xml(name)}</name>`, '  <version>1.0.0</version>', '  <packageID></packageID>', '  <ProductID></ProductID>', '  <date></date>', '  <license></license>', '  <description></description>', '  <helpfile></helpfile>', '  <installdir></installdir>', '  <classname></classname>', '  <androidclassname></androidclassname>', '  <sourcedir></sourcedir>', '  <androidsourcedir></androidsourcedir>', '  <macsourcedir></macsourcedir>', '  <maclinkerflags></maclinkerflags>', '  <maccompilerflags></maccompilerflags>', '  <androidinject></androidinject>', '  <androidmanifestinject></androidmanifestinject>', '  <iosplistinject></iosplistinject>', '  <androidactivityinject></androidactivityinject>', '  <gradleinject></gradleinject>', '  <iosSystemFrameworks/>', '  <iosThirdPartyFrameworks/>', '  <ConfigOptions>', configOptions, '  </ConfigOptions>', '  <androidPermissions/>', '  <IncludedResources/>', '  <files/>', '</extension>'].join(eol)
    default:
      return ''
  }
}

async function removeCreated(files: string[]): Promise<void> {
  await Promise.allSettled(files.map((file) => rm(file, { force: true, recursive: true })))
}

function replaceTag(source: string, name: string, value: string): string {
  const pattern = new RegExp(`(<${escaped(name)}\\b[^>]*>)[\\s\\S]*?(<\\/${escaped(name)}>)`, 'i')
  return pattern.test(source)
    ? source.replace(pattern, (_match, open: string, close: string) => `${open}${xml(value)}${close}`)
    : source
}

type ResourceEdit = {
  file: string
  before: string
  after: string
}

const actionArgumentKinds: Partial<Record<ResourceType, number>> = {
  sprite: 5,
  sound: 6,
  background: 7,
  path: 8,
  script: 9,
  object: 10,
  room: 11,
  font: 12,
  timeline: 14
}

const actionArgumentTags: Record<number, string> = {
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

const includedResourceTypes: Record<string, ResourceType> = {
  sprite: 'sprite',
  sprites: 'sprite',
  sound: 'sound',
  sounds: 'sound',
  background: 'background',
  backgrounds: 'background',
  path: 'path',
  paths: 'path',
  script: 'script',
  scripts: 'script',
  shader: 'shader',
  shaders: 'shader',
  font: 'font',
  fonts: 'font',
  timeline: 'timeline',
  timelines: 'timeline',
  object: 'object',
  objects: 'object',
  room: 'room',
  rooms: 'room',
  file: 'file',
  files: 'file',
  includedfile: 'file',
  datafile: 'file',
  extension: 'extension',
  extensions: 'extension'
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
}

function replaceElementReference(
  source: string,
  tagName: string,
  oldName: string,
  nextName: string
): string {
  const pattern = new RegExp(
    `(<${escaped(tagName)}\\b[^>]*>)(\\s*)${escaped(xml(oldName))}(\\s*)(<\\/${escaped(tagName)}>)`,
    'gi'
  )
  return source.replace(pattern, (_match, open: string, leading: string, trailing: string, close: string) =>
    `${open}${leading}${xml(nextName)}${trailing}${close}`)
}

function replaceTagAttributeReference(
  source: string,
  tagName: string,
  attribute: string,
  oldName: string,
  nextName: string
): string {
  const tags = new RegExp(`<${escaped(tagName)}\\b[^>]*>`, 'gi')
  const value = new RegExp(
    `(\\b${escaped(attribute)}\\s*=\\s*["'])${escaped(xmlAttr(oldName))}(["'])`,
    'i'
  )
  return source.replace(tags, (entry) => entry.replace(value, `$1${xmlAttr(nextName)}$2`))
}

function replaceActionArgumentReferences(
  source: string,
  type: ResourceType,
  oldName: string,
  nextName: string
): string {
  const kind = actionArgumentKinds[type]
  if (kind === undefined) return source
  const valueTag = actionArgumentTags[kind]
  return source.replace(/<argument\b[^>]*>[\s\S]*?<\/argument>/gi, (argument) => {
    const match = argument.match(/<kind\b[^>]*>\s*(\d+)\s*<\/kind>/i)
    if (Number(match?.[1]) !== kind) return argument
    const replaced = replaceElementReference(argument, valueTag, oldName, nextName)
    return replaced === argument
      ? replaceElementReference(argument, 'string', oldName, nextName)
      : replaced
  })
}

function replaceIncludedResourceReferences(
  source: string,
  type: ResourceType,
  oldPath: string,
  nextPath: string
): string {
  const oldKey = cleanPath(oldPath).toLowerCase()
  if (!oldKey) return source
  return source.replace(
    /(<IncludedResources\b[^>]*>)([\s\S]*?)(<\/IncludedResources>)/gi,
    (_section, open: string, contents: string, close: string) => {
      const next = contents.replace(
        /<([A-Za-z_][\w:.-]*)\b([^>]*)>([^<]*)<\/\1>/gi,
        (entry, nodeName: string, attributes: string, value: string) => {
          const typeMatch = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)
          const hint = (typeMatch?.[1] || nodeName).toLowerCase().replace(/[\s_-]/g, '')
          if (includedResourceTypes[hint] !== type) return entry
          if (cleanPath(decodeXml(value)).toLowerCase() !== oldKey) return entry
          const separator = value.includes('\\') ? '\\' : '/'
          const path = cleanPath(nextPath).replace(/\//g, separator)
          return entry.replace(value, () => xml(path))
        }
      )
      return `${open}${next}${close}`
    }
  )
}

function replaceResourceReferences(
  file: string,
  source: string,
  type: ResourceType,
  oldName: string,
  nextName: string,
  oldPath: string,
  nextPath: string
): string {
  const path = file.toLowerCase()
  let result = source
  if (path.endsWith('.object.gmx')) {
    if (type === 'sprite') {
      result = replaceElementReference(result, 'spriteName', oldName, nextName)
      result = replaceElementReference(result, 'maskName', oldName, nextName)
    } else if (type === 'object') {
      result = replaceElementReference(result, 'parentName', oldName, nextName)
      result = replaceElementReference(result, 'whoName', oldName, nextName)
      result = replaceTagAttributeReference(result, 'event', 'ename', oldName, nextName)
    }
    result = replaceActionArgumentReferences(result, type, oldName, nextName)
  } else if (path.endsWith('.timeline.gmx')) {
    result = replaceActionArgumentReferences(result, type, oldName, nextName)
  } else if (path.endsWith('.room.gmx')) {
    if (type === 'background') {
      result = replaceTagAttributeReference(result, 'background', 'name', oldName, nextName)
      result = replaceTagAttributeReference(result, 'tile', 'bgName', oldName, nextName)
    } else if (type === 'object') {
      result = replaceTagAttributeReference(result, 'view', 'objName', oldName, nextName)
      result = replaceTagAttributeReference(result, 'instance', 'objName', oldName, nextName)
    }
  } else if (path.endsWith('.extension.gmx')) {
    result = replaceIncludedResourceReferences(result, type, oldPath, nextPath)
  }
  return result
}

async function resourceReferenceEdits(
  tree: ProjectTree,
  type: ResourceType,
  oldName: string,
  nextName: string,
  oldPath: string,
  nextPath: string,
  excluded: Set<string>
): Promise<ResourceEdit[]> {
  const folders = [
    ['objects', '.object.gmx'],
    ['timelines', '.timeline.gmx'],
    ['rooms', '.room.gmx'],
    ['extensions', '.extension.gmx']
  ] as const
  const edits: ResourceEdit[] = []
  let visited = 0
  let bytes = 0

  async function visit(folder: string, suffix: string): Promise<void> {
    let entries
    try {
      entries = await readdir(folder, { withFileTypes: true })
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
      throw error
    }
    for (const entry of entries) {
      if (entry.isSymbolicLink()) continue
      const file = join(folder, entry.name)
      if (entry.isDirectory()) {
        await visit(file, suffix)
        continue
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith(suffix)) continue
      visited += 1
      if (visited > 20000) throw new Error('Project has too many resource files to rename safely')
      if (excluded.has(pathKey(file))) continue
      const info = await stat(file)
      if (info.size > maxResourceSize || bytes + info.size > 512 * 1024 * 1024) {
        throw new Error('Project resource references are too large to rename safely')
      }
      bytes += info.size
      const before = await readFile(file, 'utf8')
      const after = replaceResourceReferences(
        file,
        before,
        type,
        oldName,
        nextName,
        oldPath,
        nextPath
      )
      if (after !== before) edits.push({ file, before, after })
    }
  }

  for (const [folder, suffix] of folders) {
    await visit(resolve(tree.folder, folder), suffix)
  }
  return edits
}

async function applyResourceEdits(edits: ResourceEdit[]): Promise<() => Promise<void>> {
  const written: ResourceEdit[] = []
  try {
    for (const edit of edits) {
      written.push(edit)
      await writeFile(edit.file, edit.after, 'utf8')
    }
  } catch (error) {
    await Promise.allSettled(written.map((edit) => writeFile(edit.file, edit.before, 'utf8')))
    throw error
  }
  return async () => {
    await Promise.allSettled([...written].reverse().map((edit) =>
      writeFile(edit.file, edit.before, 'utf8')))
  }
}

async function copyDependency(
  source: string,
  target: string,
  created: string[],
  sourceRoot: string,
  targetRoot: string
): Promise<void> {
  if (!inside(sourceRoot, source) || !inside(targetRoot, target)) {
    throw new Error('Invalid resource dependency path')
  }
  if (!existsSync(source)) return
  if (existsSync(target)) throw new Error(`File ${basename(target)} already exists`)
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
  created.push(target)
}

async function checkDependencyFolder(folder: string): Promise<void> {
  let files = 0
  let bytes = 0
  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isSymbolicLink()) throw new Error('Extension folders cannot contain symbolic links')
      const path = join(current, entry.name)
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile()) {
        const info = await stat(path)
        files += 1
        bytes += info.size
        if (files > 10000 || bytes > maxResourceSize) throw new Error('Extension folder is too large')
      }
    }
  }
  await visit(folder)
}

async function extensionAssets(file: string): Promise<{ folder: string; files: string[] }> {
  const source = await readFile(file, 'utf8')
  const root = parseXml(source, 'extension')
  const extensionName = text(child(root, 'name')) || basename(file).replace(/\.extension\.gmx$/i, '')
  const folder = resolve(dirname(file), extensionName)
  if (!inside(dirname(file), folder)) throw new Error('Invalid extension folder')
  const filesNode = child(root, 'files')
  const files = (filesNode ? children(filesNode) : []).flatMap((item) => {
    if (tag(item) !== 'file') return []
    const filename = cleanPath(text(child(item, 'filename')))
    if (!filename) return []
    const asset = resolve(folder, ...filename.split('/').filter(Boolean))
    return inside(folder, asset) ? [asset] : []
  })
  return { folder, files }
}

async function copyResourceFile(
  type: ResourceType,
  sourceFile: string,
  targetFile: string,
  name: string,
  projectFolder: string
): Promise<string[]> {
  const info = await stat(sourceFile)
  if (!info.isFile() || info.size > maxResourceSize) throw new Error('Resource file is too large')
  if (existsSync(targetFile)) throw new Error(`Resource ${name} already exists`)
  const created: string[] = []
  try {
    await mkdir(dirname(targetFile), { recursive: true })
    if (!['sprite', 'sound', 'background', 'font', 'extension'].includes(type)) {
      await copyFile(sourceFile, targetFile)
      created.push(targetFile)
      return created
    }
    let source = await readFile(sourceFile, 'utf8')
    if (type === 'sprite') {
      let frameIndex = 0
      const tasks: Promise<void>[] = []
      source = source.replace(/(<frame\b[^>]*>)([\s\S]*?)(<\/frame>)/gi, (_entry, open: string, value: string, close: string) => {
        const oldRelative = cleanPath(value)
        const extension = extname(oldRelative) || '.png'
        const targetRelative = `images/${name}_${frameIndex}${extension}`
        const from = resolve(dirname(sourceFile), ...oldRelative.split('/').filter(Boolean))
        const to = resolve(dirname(targetFile), ...targetRelative.split('/'))
        tasks.push(copyDependency(from, to, created, dirname(sourceFile), dirname(targetFile)))
        frameIndex += 1
        return `${open}${targetRelative.replace(/\//g, '\\')}${close}`
      })
      await Promise.all(tasks)
    } else if (type === 'background') {
      const root = parseXml(source, 'background')
      const oldRelative = cleanPath(text(child(root, 'data')))
      if (oldRelative) {
        const extension = extname(oldRelative) || '.png'
        const targetRelative = `images/${name}${extension}`
        await copyDependency(
          resolve(dirname(sourceFile), ...oldRelative.split('/')),
          resolve(dirname(targetFile), ...targetRelative.split('/')),
          created,
          dirname(sourceFile),
          dirname(targetFile)
        )
        source = replaceTag(source, 'data', targetRelative.replace(/\//g, '\\'))
      }
    } else if (type === 'sound') {
      const root = parseXml(source, 'sound')
      const oldName = cleanPath(text(child(root, 'data')))
      if (oldName) {
        const extension = extname(oldName) || '.wav'
        const targetName = `${name}${extension}`
        const from = resolve(dirname(sourceFile), 'audio', basename(oldName))
        const to = resolve(dirname(targetFile), 'audio', targetName)
        await copyDependency(from, to, created, dirname(sourceFile), dirname(targetFile))
        source = replaceTag(source, 'data', targetName)
        source = replaceTag(source, 'origname', relative(projectFolder, to).replace(/\//g, '\\'))
      }
    } else if (type === 'font') {
      const root = parseXml(source, 'font')
      const oldName = cleanPath(text(child(root, 'image')))
      if (oldName) {
        const extension = extname(oldName) || '.png'
        const targetName = `${name}${extension}`
        await copyDependency(
          resolve(dirname(sourceFile), oldName),
          resolve(dirname(targetFile), targetName),
          created,
          dirname(sourceFile),
          dirname(targetFile)
        )
        source = replaceTag(source, 'image', targetName)
      }
    } else if (type === 'extension') {
      const root = parseXml(source, 'extension')
      const oldName = text(child(root, 'name')) || basename(sourceFile).replace(/\.extension\.gmx$/i, '')
      const oldFolder = resolve(dirname(sourceFile), oldName)
      const newFolder = resolve(dirname(targetFile), name)
      if (!inside(dirname(sourceFile), oldFolder) || !inside(dirname(targetFile), newFolder)) {
        throw new Error('Invalid extension folder')
      }
      if (existsSync(oldFolder)) {
        if (existsSync(newFolder)) throw new Error(`Extension folder ${name} already exists`)
        await checkDependencyFolder(oldFolder)
        await cp(oldFolder, newFolder, { recursive: true, errorOnExist: true, force: false })
        created.push(newFolder)
      }
      source = replaceTag(source, 'name', name)
    }
    await writeFile(targetFile, source, 'utf8')
    created.push(targetFile)
    return created
  } catch (error) {
    await removeCreated(created)
    throw error
  }
}

async function resourceFiles(tree: ProjectTree, node: ResourceNode, groupPath: string[]): Promise<string[]> {
  const file = diskFile(tree, node, groupPath)
  const result = [file]
  if (!existsSync(file)) return result
  try {
    if (tree.spec.type === 'extension') {
      const assets = await extensionAssets(file)
      if (existsSync(assets.folder)) result.push(assets.folder)
      return result
    }
    if (!['sprite', 'sound', 'background', 'font'].includes(tree.spec.type)) return result
    const source = await readFile(file, 'utf8')
    const root = parseXml(source, `${tree.spec.type} resource`)
    if (tree.spec.type === 'sprite') {
      const frames = child(root, 'frames')
      for (const frame of frames ? children(frames) : []) {
        const value = cleanPath(text(frame))
        if (value) result.push(resolve(dirname(file), ...value.split('/')))
      }
    } else if (tree.spec.type === 'background') {
      const value = cleanPath(text(child(root, 'data')))
      if (value) result.push(resolve(dirname(file), ...value.split('/')))
    } else if (tree.spec.type === 'sound') {
      const value = cleanPath(text(child(root, 'data')))
      if (value) result.push(resolve(dirname(file), 'audio', basename(value)))
    } else if (tree.spec.type === 'font') {
      const value = cleanPath(text(child(root, 'image')))
      if (value) result.push(resolve(dirname(file), value))
    }
  } catch {
    // Keep the descriptor removable even if its dependent file list is malformed.
  }
  return [...new Set(result.filter((item) => item === file || inside(dirname(file), item)))]
}

function pathKey(file: string): string {
  const path = resolve(file)
  return process.platform === 'win32' ? path.toLowerCase() : path
}

async function usedResourceFiles(tree: ProjectTree): Promise<Set<string>> {
  const result = new Set<string>()
  async function visit(items: TreeNode[], trail: string[]): Promise<void> {
    for (const item of items) {
      if (item.kind === 'group') await visit(item.items, [...trail, item.name])
      else for (const file of await resourceFiles(tree, item, trail)) result.add(pathKey(file))
    }
  }
  await visit(tree.items, [])
  return result
}

function fileLocations(tree: ProjectTree): Map<ResourceNode, string> {
  const result = new Map<ResourceNode, string>()
  function visit(items: TreeNode[], trail: string[]): void {
    for (const item of items) {
      if (item.kind === 'group') visit(item.items, [...trail, item.name])
      else result.set(item, diskFile(tree, item, trail))
    }
  }
  visit(tree.items, [])
  return result
}

async function saveWithFileMoves(
  tree: ProjectTree,
  before: Map<ResourceNode, string> | undefined
): Promise<void> {
  const source = replaceSection(tree)
  const moves: Array<{ from: string; to: string }> = []
  if (before) {
    const after = fileLocations(tree)
    for (const [node, from] of before) {
      const to = after.get(node)
      if (!to || resolve(from) === resolve(to) || !existsSync(from)) continue
      if (!inside(tree.folder, from) || !inside(tree.folder, to)) throw new Error('Invalid included file move')
      if (existsSync(to)) throw new Error(`Included file ${basename(to)} already exists`)
      moves.push({ from, to })
    }
  }
  const completed: Array<{ from: string; to: string }> = []
  try {
    for (const move of moves) {
      await mkdir(dirname(move.to), { recursive: true })
      await rename(move.from, move.to)
      completed.push(move)
    }
    await writeFile(tree.file, source, 'utf8')
  } catch (error) {
    for (const move of completed.reverse()) {
      try {
        await mkdir(dirname(move.from), { recursive: true })
        await rename(move.to, move.from)
      } catch {
        // Preserve the original error; any successfully moved file remains inside the project.
      }
    }
    throw error
  }
}

export async function createResource(projectFile: string, type: ResourceType, groupPath: unknown): Promise<void> {
  const tree = await loadTree(projectFile, type)
  const path = validateGroupPath(groupPath)
  if (tree.spec.mode === 'extensions' && path.length > 0) throw new Error('Extensions do not support groups')
  const parent = groupAt(tree.items, path)
  const names = allNames(tree.items, tree.spec)
  let name = uniqueName(tree.spec.base, names, resourceCount(tree.items) + 1)
  let node: ResourceNode
  let file: string
  if (tree.spec.mode === 'files') {
    let filename = `${name}.txt`
    while (names.has(filename.toLowerCase())) {
      name = uniqueName(tree.spec.base, names, Number.parseInt(name.replace(/^\D+/, ''), 10) + 1 || 1)
      filename = `${name}.txt`
    }
    const data: DataFile = {
      name: filename,
      filename,
      exists: '-1',
      size: '0',
      exportAction: '2',
      exportDir: '',
      overwrite: '0',
      freeData: '-1',
      removeEnd: '0',
      store: '0',
      configs: tree.configs.map((config) => ({ name: config, mask: '9223372036854775807' }))
    }
    node = { kind: 'resource', value: filename, attrs: {}, data }
    file = diskFile(tree, node, path)
  } else {
    node = {
      kind: 'resource',
      value: resourceValue(tree.spec, name),
      attrs: tree.spec.type === 'shader' ? { type: 'GLSLES' } : {}
    }
    file = diskFile(tree, node)
  }
  if (!inside(tree.folder, file) || existsSync(file)) throw new Error(`Resource ${name} already exists`)
  parent.push(node)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, tree.spec.mode === 'files' ? '' : baseTemplate(type, name, tree.configs, tree.eol), 'utf8')
  try {
    await saveWithFileMoves(tree, undefined)
  } catch (error) {
    await rm(file, { force: true })
    throw error
  }
}

export async function importImageResource(
  projectFile: string,
  type: 'sprite' | 'background',
  sourceName: string,
  image: Buffer,
  width: number,
  height: number
): Promise<void> {
  if (
    !['sprite', 'background'].includes(type) ||
    !Buffer.isBuffer(image) ||
    image.length < 8 ||
    image.length > maxResourceSize ||
    image.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > 32767 ||
    height > 32767
  ) {
    throw new Error('Invalid image data')
  }

  const tree = await loadTree(projectFile, type)
  const names = allNames(tree.items, tree.spec)
  const sourceFile = basename(sourceName)
  const extension = extname(sourceFile)
  const base = identifier(sourceFile.slice(0, extension ? -extension.length : undefined) || tree.spec.base)
  let name = base
  let index = 2
  let node: ResourceNode
  let descriptor: string
  let imageFile: string

  while (true) {
    node = { kind: 'resource', value: resourceValue(tree.spec, name), attrs: {} }
    descriptor = diskFile(tree, node)
    imageFile = resolve(
      dirname(descriptor),
      'images',
      type === 'sprite' ? `${name}_0.png` : `${name}.png`
    )
    if (!names.has(name.toLowerCase()) && !existsSync(descriptor) && !existsSync(imageFile)) break
    name = `${base}_${index}`
    index += 1
  }

  const imagePath = type === 'sprite' ? `images\\${name}_0.png` : `images\\${name}.png`
  let descriptorSource = baseTemplate(type, name, tree.configs, tree.eol)
  descriptorSource = replaceTag(descriptorSource, 'width', String(width))
  descriptorSource = replaceTag(descriptorSource, 'height', String(height))
  if (type === 'sprite') {
    descriptorSource = replaceTag(descriptorSource, 'bbox_right', String(width - 1))
    descriptorSource = replaceTag(descriptorSource, 'bbox_bottom', String(height - 1))
    descriptorSource = descriptorSource.replace(
      /<frames\s*\/>/i,
      `<frames>${tree.eol}    <frame index="0">${xml(imagePath)}</frame>${tree.eol}  </frames>`
    )
  } else {
    descriptorSource = replaceTag(descriptorSource, 'data', imagePath)
  }

  const created = [descriptor, imageFile]
  try {
    await mkdir(dirname(imageFile), { recursive: true })
    await writeFile(imageFile, image)
    await writeFile(descriptor, descriptorSource, 'utf8')
    tree.items.push(node)
    await saveWithFileMoves(tree, undefined)
  } catch (error) {
    await removeCreated(created)
    throw error
  }
}

export async function importSoundResource(projectFile: string, sourceFile: string): Promise<void> {
  const source = resolve(sourceFile)
  const extension = extname(source).toLowerCase()
  if (!['.wav', '.mp3', '.ogg'].includes(extension)) throw new Error('Unsupported audio format')
  const info = await stat(source)
  if (!info.isFile()) throw new Error('Invalid audio file')
  if (info.size < 1 || info.size > maxResourceSize) throw new Error('Audio file is too large')

  const tree = await loadTree(projectFile, 'sound')
  const names = allNames(tree.items, tree.spec)
  const sourceName = basename(source)
  const base = identifier(sourceName.slice(0, -extension.length) || tree.spec.base)
  let name = base
  let index = 2
  let node: ResourceNode
  let descriptor: string
  let audioFile: string

  while (true) {
    node = { kind: 'resource', value: resourceValue(tree.spec, name), attrs: {} }
    descriptor = diskFile(tree, node)
    audioFile = resolve(dirname(descriptor), 'audio', `${name}${extension}`)
    if (!names.has(name.toLowerCase()) && !existsSync(descriptor) && !existsSync(audioFile)) break
    name = `${base}_${index}`
    index += 1
  }

  const data = basename(audioFile)
  let descriptorSource = baseTemplate('sound', name, tree.configs, tree.eol)
  descriptorSource = replaceTag(descriptorSource, 'kind', extension === '.wav' ? '0' : '3')
  descriptorSource = replaceTag(descriptorSource, 'extension', extension)
  descriptorSource = replaceTag(
    descriptorSource,
    'origname',
    relative(tree.folder, audioFile).replace(/\//g, '\\')
  )
  descriptorSource = replaceTag(descriptorSource, 'data', data)
  if (extension === '.mp3') {
    descriptorSource = replaceTag(descriptorSource, 'compressed', '1')
    descriptorSource = replaceTag(descriptorSource, 'streamed', '1')
  }

  const created = [descriptor, audioFile]
  try {
    await mkdir(dirname(audioFile), { recursive: true })
    await copyFile(source, audioFile)
    await writeFile(descriptor, descriptorSource, 'utf8')
    tree.items.push(node)
    await saveWithFileMoves(tree, undefined)
  } catch (error) {
    await removeCreated(created)
    throw error
  }
}

export async function addExistingResource(
  projectFile: string,
  type: ResourceType,
  groupPath: unknown,
  sourceFile: string
): Promise<void> {
  if (type === 'extension' && extname(sourceFile).toLowerCase() === '.gmez') {
    return withGmezDescriptor(sourceFile, (descriptor) =>
      addExistingResource(projectFile, type, groupPath, descriptor))
  }
  const tree = await loadTree(projectFile, type)
  const path = validateGroupPath(groupPath)
  if (tree.spec.mode === 'extensions' && path.length > 0) throw new Error('Extensions do not support groups')
  const parent = groupAt(tree.items, path)
  const names = allNames(tree.items, tree.spec)
  if (tree.spec.mode === 'files') {
    const sourceName = basename(sourceFile)
    const extension = extname(sourceName)
    const stem = sourceName.slice(0, extension ? -extension.length : undefined) || 'file'
    let filename = sourceName
    let index = 2
    while (names.has(filename.toLowerCase()) || existsSync(resolve(tree.folder, 'datafiles', ...path, filename))) {
      filename = `${stem}_${index}${extension}`
      index += 1
    }
    const target = resolve(tree.folder, 'datafiles', ...path, filename)
    const info = await stat(sourceFile)
    if (!info.isFile() || info.size > maxResourceSize) throw new Error('Included file is too large')
    await mkdir(dirname(target), { recursive: true })
    await copyFile(sourceFile, target)
    const data: DataFile = {
      name: filename,
      filename,
      exists: '-1',
      size: String(info.size),
      exportAction: '2',
      exportDir: '',
      overwrite: '0',
      freeData: '-1',
      removeEnd: '0',
      store: '0',
      configs: tree.configs.map((config) => ({ name: config, mask: '9223372036854775807' }))
    }
    parent.push({ kind: 'resource', value: filename, attrs: {}, data })
    try {
      await saveWithFileMoves(tree, undefined)
    } catch (error) {
      await rm(target, { force: true })
      throw error
    }
    return
  }
  const sourceName = basename(sourceFile)
  if (!sourceName.toLowerCase().endsWith(tree.spec.extension.toLowerCase())) {
    throw new Error(`Expected a ${tree.spec.extension} resource file`)
  }
  const stem = tree.spec.extension && sourceName.toLowerCase().endsWith(tree.spec.extension.toLowerCase())
    ? sourceName.slice(0, -tree.spec.extension.length)
    : sourceName.slice(0, sourceName.length - extname(sourceName).length)
  const base = identifier(stem || tree.spec.base)
  const name = names.has(base.toLowerCase()) ? copyName(base, names) : base
  const node: ResourceNode = {
    kind: 'resource',
    value: resourceValue(tree.spec, name),
    attrs: tree.spec.type === 'shader' ? { type: 'GLSLES' } : {}
  }
  const target = diskFile(tree, node)
  const created = await copyResourceFile(type, sourceFile, target, name, tree.folder)
  parent.push(node)
  try {
    await saveWithFileMoves(tree, undefined)
  } catch (error) {
    await removeCreated(created)
    throw error
  }
}

export async function duplicateResource(projectFile: string, ref: unknown): Promise<void> {
  const target = validateRef(ref)
  if (target.kind !== 'resource') throw new Error('Only resources can be duplicated')
  const tree = await loadTree(projectFile, target.type)
  const current = resourceAt(tree.items, target)
  const names = allNames(tree.items, tree.spec)
  if (tree.spec.mode === 'files') {
    const oldFile = diskFile(tree, current.node, target.groupPath)
    const oldName = current.node.data?.filename || current.node.value
    const extension = extname(oldName)
    const stem = oldName.slice(0, extension ? -extension.length : undefined)
    let filename = `${stem}_copy${extension}`
    let index = 2
    while (names.has(filename.toLowerCase())) {
      filename = `${stem}_copy${index}${extension}`
      index += 1
    }
    const data = { ...current.node.data!, name: filename, filename }
    const node: ResourceNode = { kind: 'resource', value: filename, attrs: {}, data }
    const newFile = diskFile(tree, node, target.groupPath)
    await mkdir(dirname(newFile), { recursive: true })
    await copyFile(oldFile, newFile)
    current.parent.splice(current.index + 1, 0, node)
    try {
      await saveWithFileMoves(tree, undefined)
    } catch (error) {
      await rm(newFile, { force: true })
      throw error
    }
    return
  }
  const oldName = nodeName(current.node, tree.spec)
  const name = copyName(oldName, names)
  const oldFile = diskFile(tree, current.node)
  const node: ResourceNode = {
    kind: 'resource',
    value: resourceValue(tree.spec, name),
    attrs: { ...current.node.attrs }
  }
  const newFile = diskFile(tree, node)
  const created = await copyResourceFile(target.type, oldFile, newFile, name, tree.folder)
  current.parent.splice(current.index + 1, 0, node)
  try {
    await saveWithFileMoves(tree, undefined)
  } catch (error) {
    await removeCreated(created)
    throw error
  }
}

export async function createResourceGroup(projectFile: string, type: ResourceType, groupPath: unknown): Promise<void> {
  const tree = await loadTree(projectFile, type)
  if (tree.spec.mode === 'extensions') throw new Error('Extensions do not support groups')
  const path = validateGroupPath(groupPath)
  const parent = groupAt(tree.items, path)
  const names = new Set(parent.filter((item): item is GroupNode => item.kind === 'group').map((item) => item.name.toLowerCase()))
  let name = 'Group'
  let index = 2
  while (names.has(name.toLowerCase())) {
    name = `Group ${index}`
    index += 1
  }
  parent.push({ kind: 'group', name, items: [] })
  await saveWithFileMoves(tree, tree.spec.mode === 'files' ? fileLocations(tree) : undefined)
}

export async function sortResourceGroup(projectFile: string, type: ResourceType, groupPath: unknown): Promise<void> {
  const tree = await loadTree(projectFile, type)
  const path = validateGroupPath(groupPath)
  const items = groupAt(tree.items, path)
  items.sort((left, right) => {
    if (left.kind !== right.kind) return left.kind === 'group' ? -1 : 1
    return nodeName(left, tree.spec).localeCompare(nodeName(right, tree.spec), undefined, { sensitivity: 'base' })
  })
  await saveWithFileMoves(tree, undefined)
}

export async function deleteResourceItem(projectFile: string, value: unknown): Promise<string[]> {
  const ref = validateRef(value)
  if (ref.kind === 'root') throw new Error('Top-level resource folders cannot be deleted')
  const tree = await loadTree(projectFile, ref.type)
  const files: string[] = []
  if (ref.kind === 'resource') {
    const current = resourceAt(tree.items, ref)
    files.push(...await resourceFiles(tree, current.node, ref.groupPath))
    current.parent.splice(current.index, 1)
  } else {
    const current = groupNode(tree.items, ref.groupPath)
    async function collect(items: TreeNode[], trail: string[]): Promise<void> {
      for (const item of items) {
        if (item.kind === 'group') await collect(item.items, [...trail, item.name])
        else files.push(...await resourceFiles(tree, item, trail))
      }
    }
    await collect(current.node.items, ref.groupPath)
    current.parent.splice(current.index, 1)
  }
  const kept = await usedResourceFiles(tree)
  await saveWithFileMoves(tree, undefined)
  return [...new Set(files.filter((file) => (
    inside(tree.folder, file) && existsSync(file) && !kept.has(pathKey(file))
  )))]
}

export async function renameResourceItem(
  projectFile: string,
  value: unknown,
  nextName: unknown
): Promise<string[]> {
  const ref = validateRef(value)
  if (ref.kind === 'root') throw new Error('Top-level resource folders cannot be renamed')
  const tree = await loadTree(projectFile, ref.type)
  const name = validateName(nextName, ref.kind, tree.spec.mode === 'files')
  if (ref.kind === 'group') {
    const before = tree.spec.mode === 'files' ? fileLocations(tree) : undefined
    const current = groupNode(tree.items, ref.groupPath)
    const siblings = current.parent.filter((item): item is GroupNode => item.kind === 'group' && item !== current.node)
    if (siblings.some((item) => item.name.toLowerCase() === name.toLowerCase())) throw new Error(`Group ${name} already exists`)
    current.node.name = name
    await saveWithFileMoves(tree, before)
    return []
  }
  const current = resourceAt(tree.items, ref)
  const oldName = nodeName(current.node, tree.spec)
  const oldPath = tree.spec.mode === 'files'
    ? current.node.data?.filename || current.node.value
    : current.node.value
  const names = allNames(tree.items, tree.spec)
  names.delete(oldName.toLowerCase())
  if (names.has(name.toLowerCase())) throw new Error(`Resource ${name} already exists`)
  if (tree.spec.mode === 'files') {
    const before = fileLocations(tree)
    const extension = extname(current.node.data?.filename || current.node.value)
    const filename = extname(name) ? name : `${name}${extension}`
    current.node.value = filename
    current.node.data = { ...current.node.data!, name: filename, filename }
    const edits = await resourceReferenceEdits(
      tree,
      ref.type,
      oldName,
      filename,
      oldPath,
      filename,
      new Set()
    )
    const rollback = await applyResourceEdits(edits)
    try {
      await saveWithFileMoves(tree, before)
    } catch (error) {
      await rollback()
      throw error
    }
    return []
  }
  const oldFiles = await resourceFiles(tree, current.node, ref.groupPath)
  const oldFile = diskFile(tree, current.node)
  const node: ResourceNode = {
    kind: 'resource',
    value: resourceValue(tree.spec, name),
    attrs: { ...current.node.attrs }
  }
  const newFile = diskFile(tree, node)
  if (!existsSync(oldFile)) {
    if (existsSync(newFile)) throw new Error(`Resource ${name} already exists`)
    current.parent[current.index] = node
    const edits = await resourceReferenceEdits(
      tree,
      ref.type,
      oldName,
      name,
      oldPath,
      node.value,
      new Set([pathKey(oldFile)])
    )
    const rollback = await applyResourceEdits(edits)
    try {
      await saveWithFileMoves(tree, undefined)
    } catch (error) {
      await rollback()
      throw error
    }
    return []
  }
  const created = await copyResourceFile(ref.type, oldFile, newFile, name, tree.folder)
  current.parent[current.index] = node
  let rollback: (() => Promise<void>) | undefined
  let kept: Set<string>
  try {
    const edits = await resourceReferenceEdits(
      tree,
      ref.type,
      oldName,
      name,
      oldPath,
      node.value,
      new Set([pathKey(oldFile)])
    )
    kept = await usedResourceFiles(tree)
    rollback = await applyResourceEdits(edits)
    await saveWithFileMoves(tree, undefined)
  } catch (error) {
    await rollback?.()
    await removeCreated(created)
    throw error
  }
  return oldFiles.filter((file) => !kept.has(pathKey(file)))
}

export async function moveResourceItem(
  projectFile: string,
  sourceValue: unknown,
  targetValue: unknown,
  positionValue: unknown
): Promise<void> {
  const source = validateRef(sourceValue)
  const target = validateRef(targetValue)
  const position = validatePosition(positionValue)
  if (source.kind === 'root' || source.type !== target.type) throw new Error('Resources can only move inside their own category')
  if (
    source.kind === target.kind &&
    source.path === target.path &&
    source.groupPath.length === target.groupPath.length &&
    source.groupPath.every((name, index) => name === target.groupPath[index])
  ) return
  const tree = await loadTree(projectFile, source.type)
  if (tree.spec.mode === 'extensions' && source.kind === 'group') throw new Error('Extensions do not support groups')
  if (source.kind === 'group' && target.groupPath.length >= source.groupPath.length) {
    const samePrefix = source.groupPath.every((name, index) => target.groupPath[index] === name)
    if (samePrefix) throw new Error('A group cannot be moved inside itself')
  }
  const before = tree.spec.mode === 'files' ? fileLocations(tree) : undefined
  const current = source.kind === 'resource'
    ? resourceAt(tree.items, source)
    : groupNode(tree.items, source.groupPath)
  const [node] = current.parent.splice(current.index, 1)
  let destination: TreeNode[]
  let index: number
  if (position === 'inside') {
    if (target.kind === 'resource') throw new Error('A resource cannot contain other resources')
    destination = target.kind === 'root' ? tree.items : groupAt(tree.items, target.groupPath)
    index = destination.length
  } else if (target.kind === 'resource') {
    destination = groupAt(tree.items, target.groupPath)
    const found = resourceAt(tree.items, target)
    index = found.index + (position === 'after' ? 1 : 0)
  } else if (target.kind === 'group') {
    destination = groupAt(tree.items, target.groupPath.slice(0, -1))
    const found = groupNode(tree.items, target.groupPath)
    index = found.index + (position === 'after' ? 1 : 0)
  } else {
    destination = tree.items
    index = position === 'after' ? destination.length : 0
  }
  destination.splice(index, 0, node)
  await saveWithFileMoves(tree, before)
}

export async function resourceItemPath(projectFile: string, value: unknown, preferAsset = false): Promise<string> {
  const ref = validateRef(value)
  const tree = await loadTree(projectFile, ref.type)
  if (ref.kind === 'root') return resolve(tree.folder, tree.spec.folder)
  if (ref.kind === 'group') {
    return tree.spec.mode === 'files'
      ? resolve(tree.folder, tree.spec.folder, ...ref.groupPath)
      : resolve(tree.folder, tree.spec.folder)
  }
  const current = resourceAt(tree.items, ref)
  const file = diskFile(tree, current.node, ref.groupPath)
  if (!preferAsset) return file
  if (tree.spec.type === 'extension' && existsSync(file)) {
    try {
      const assets = await extensionAssets(file)
      const asset = assets.files.find((item) => existsSync(item))
      if (asset) return asset
    } catch {
      return file
    }
  }
  const files = await resourceFiles(tree, current.node, ref.groupPath)
  return files.find((item) => item !== file && existsSync(item)) ?? file
}

export async function checkResourceReferences(projectFile: string, value: unknown): Promise<ResourceReference[]> {
  const ref = validateRef(value)
  if (ref.kind !== 'resource') throw new Error('Only resources can have references')
  const tree = await loadTree(projectFile, ref.type)
  const current = resourceAt(tree.items, ref)
  const name = nodeName(current.node, tree.spec)
  const ownFile = diskFile(tree, current.node, ref.groupPath)
  const results: ResourceReference[] = []
  let visited = 0
  let bytes = 0
  const pattern = /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
    ? new RegExp(`(^|[^A-Za-z0-9_])${escaped(name)}([^A-Za-z0-9_]|$)`, 'i')
    : undefined

  async function visit(folder: string): Promise<void> {
    if (visited >= 5000 || bytes >= 64 * 1024 * 1024 || results.length >= 500) return
    let entries
    try {
      entries = await readdir(folder, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (['node_modules', '.git', 'Configs'].includes(entry.name)) continue
      const file = join(folder, entry.name)
      if (entry.isDirectory()) await visit(file)
      else if (entry.isFile() && ['.gml', '.gmx', '.shader', '.txt', '.nsi'].includes(extname(entry.name).toLowerCase())) {
        if (resolve(file) === resolve(tree.file) || resolve(file) === resolve(ownFile)) continue
        const info = await stat(file)
        if (info.size > 4 * 1024 * 1024 || bytes + info.size > 64 * 1024 * 1024) continue
        const source = await readFile(file, 'utf8')
        visited += 1
        bytes += info.size
        const lines = source.split(/\r?\n/)
        for (let index = 0; index < lines.length && results.length < 500; index += 1) {
          if (pattern ? pattern.test(lines[index]) : lines[index].toLowerCase().includes(name.toLowerCase())) {
            results.push({
              file: relative(tree.folder, file).replace(/\\/g, '/'),
              line: index + 1,
              text: lines[index].trim().slice(0, 240)
            })
          }
        }
      }
      if (visited >= 5000 || bytes >= 64 * 1024 * 1024 || results.length >= 500) return
    }
  }
  await visit(tree.folder)
  return results
}

function validateGroupPath(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 128) throw new Error('Invalid resource group path')
  return value.map((item) => {
    if (typeof item !== 'string' || !item || item.length > 260 || /[\0\r\n<>]/.test(item)) {
      throw new Error('Invalid resource group path')
    }
    return item
  })
}

function validateRef(value: unknown): ResourceTreeRef {
  if (!value || typeof value !== 'object') throw new Error('Invalid resource')
  const ref = value as Partial<ResourceTreeRef>
  if (!ref.type || !['root', 'group', 'resource'].includes(ref.kind ?? '')) throw new Error('Invalid resource')
  specFor(ref.type)
  const kind = ref.kind as ResourceTreeRef['kind']
  const groupPath = validateGroupPath(ref.groupPath)
  const path = ref.path
  if (kind === 'resource' && (typeof path !== 'string' || !path || path.length > 1024 || path.includes('\0'))) {
    throw new Error('Invalid resource path')
  }
  return { type: ref.type, kind, groupPath, path }
}

function validateName(value: unknown, kind: ResourceTreeRef['kind'], file: boolean): string {
  if (typeof value !== 'string') throw new Error('Invalid name')
  const name = value.trim()
  if (!name || name.length > 260 || /[\0\r\n<>]/.test(name)) throw new Error('Invalid name')
  if (kind === 'group') {
    if (file && /[\\/:*?"|]/.test(name)) throw new Error('Invalid included file group name')
    return name
  }
  if (file) {
    if (/[\\/:*?"|]/.test(name) || name === '.' || name === '..') throw new Error('Invalid file name')
    return name
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error('Resource names must start with a letter or underscore and contain only letters, numbers, and underscores')
  }
  return name
}

function validatePosition(value: unknown): ResourceDropPosition {
  if (value !== 'inside' && value !== 'before' && value !== 'after') throw new Error('Invalid drop position')
  return value
}

export function resourceFilter(type: ResourceType): { name: string; extensions: string[] }[] {
  const spec = specFor(type)
  if (spec.mode === 'files') return [{ name: 'All Files', extensions: ['*'] }]
  if (spec.mode === 'extensions') {
    return [
      { name: 'Extension Packages', extensions: ['gmez', 'extension.gmx'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  }
  const extension = spec.extension.replace(/^\./, '').split('.')
  return [
    { name: `${type[0].toUpperCase()}${type.slice(1)} Resources`, extensions: [extension.join('.')] },
    { name: 'All Files', extensions: ['*'] }
  ]
}
