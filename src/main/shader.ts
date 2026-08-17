import { readFile, writeFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import type { ShaderData, ShaderType } from '../shared/types'

export const shaderMarker = '//######################_==_YOYO_SHADER_MARKER_==_######################@~'

const shaderTypes = new Set<ShaderType>(['GLSLES', 'GLSL', 'HLSL9', 'HLSL11'])
const maxShaderSize = 32 * 1024 * 1024

export function shaderType(value: string | null | undefined): ShaderType {
  return shaderTypes.has(value as ShaderType) ? value as ShaderType : 'GLSLES'
}

export async function loadShader(file: string, type: ShaderType): Promise<ShaderData | undefined> {
  try {
    const data = await readFile(file)
    if (data.length > maxShaderSize) return undefined
    const bom = data.length >= 3 && data[0] === 0xef && data[1] === 0xbb && data[2] === 0xbf
    const source = data.subarray(bom ? 3 : 0).toString('utf8')
    if (source.includes('\0')) return undefined
    const marker = source.indexOf(shaderMarker)

    return {
      type,
      vertex: marker >= 0 ? source.slice(0, marker) : source,
      fragment: marker >= 0 ? source.slice(marker + shaderMarker.length) : '',
      bom,
      eol: source.includes('\r\n') ? 'crlf' : 'lf'
    }
  } catch {
    return undefined
  }
}

function code(value: unknown, eol: string): string {
  if (
    typeof value !== 'string' ||
    value.includes('\0') ||
    value.includes(shaderMarker) ||
    Buffer.byteLength(value, 'utf8') > maxShaderSize
  ) {
    throw new Error('Invalid shader code')
  }
  return value.replace(/\r\n|\r|\n/g, eol)
}

function cleanPath(value: string): string {
  return value.trim().replace(/\\/g, '/').replace(/^\.\//, '').toLocaleLowerCase()
}

function withExtension(value: string): string {
  return value.endsWith('.shader') ? value : `${value}.shader`
}

function updateType(source: string, shaderPath: string, type: ShaderType): string {
  let found = false
  const target = withExtension(cleanPath(shaderPath))
  const next = source.replace(/<shader\b[^>]*>[\s\S]*?<\/shader>/gi, (entry) => {
    const match = /^(<shader\b[^>]*>)([\s\S]*)(<\/shader>)$/i.exec(entry)
    if (!match || withExtension(cleanPath(match[2])) !== target) return entry
    found = true
    const open = /\btype\s*=\s*(['"])[^'"]*\1/i.test(match[1])
      ? match[1].replace(/\btype\s*=\s*(['"])[^'"]*\1/i, `type="${type}"`)
      : match[1].replace(/>$/, ` type="${type}">`)
    return `${open}${match[2]}${match[3]}`
  })
  if (!found) throw new Error('Shader is missing from the project file')
  return next
}

export async function saveShader(file: string, projectFile: string, value: unknown): Promise<void> {
  if (!value || typeof value !== 'object') throw new Error('Invalid shader data')
  const shader = value as ShaderData
  if (!shaderTypes.has(shader.type) || typeof shader.bom !== 'boolean' || (shader.eol !== 'lf' && shader.eol !== 'crlf')) {
    throw new Error('Invalid shader data')
  }

  const eol = shader.eol === 'crlf' ? '\r\n' : '\n'
  const source = `${code(shader.vertex, eol)}${shaderMarker}${code(shader.fragment, eol)}`
  if (Buffer.byteLength(source, 'utf8') > maxShaderSize) throw new Error('Shader file is too large')
  const body = Buffer.from(source, 'utf8')
  const output = shader.bom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body

  const projectSource = await readFile(projectFile, 'utf8')
  const path = relative(dirname(projectFile), file).replace(/\\/g, '/')
  const projectOutput = updateType(projectSource, path, shader.type)
  await Promise.all([
    writeFile(file, output),
    projectOutput === projectSource ? Promise.resolve() : writeFile(projectFile, projectOutput, 'utf8')
  ])
}
