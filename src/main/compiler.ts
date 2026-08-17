import { app } from 'electron'
import { stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'

const requiredFiles = [
  'gmx.exe',
  'Runner.exe',
  'ffmpeg.exe',
  'HLSLCompiler.exe',
  'libEGL.dll',
  'libGLESv2.dll',
  'VShaderCommon.shader',
  'FShaderCommon.shader',
  'D3D11ShaderParser.exe',
  'd3dcompiler_46.dll',
  'HLSL11_PShaderCommon.shader',
  'HLSL11_VShaderCommon.shader',
  'd3dx9_43.dll'
] as const

export type Compiler = {
  file: string
  folder: string
  runner: string
  runtimeDll: string
}

export function compilerPath(): string {
  const custom = process.env.OPENGMS_GMX_PATH?.trim()
  if (custom) return resolve(custom)

  if (process.platform !== 'win32') {
    throw new Error('The bundled GMX compiler currently supports Windows only')
  }

  return app.isPackaged
    ? join(process.resourcesPath, 'gmx', 'gmx.exe')
    : join(app.getAppPath(), 'assets', 'gmx', 'windows-x64', 'gmx.exe')
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

export async function getCompiler(): Promise<Compiler> {
  const file = compilerPath()
  const folder = dirname(file)
  const missing = (await Promise.all(requiredFiles.map(async (name) => ({
    name,
    found: await isFile(join(folder, name))
  })))).filter((item) => !item.found)

  if (missing.length) {
    throw new Error(`GMX compiler is incomplete; missing ${missing.map((item) => item.name).join(', ')}`)
  }

  return {
    file,
    folder,
    runner: join(folder, 'Runner.exe'),
    runtimeDll: join(folder, 'd3dx9_43.dll')
  }
}
