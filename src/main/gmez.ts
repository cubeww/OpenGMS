import { execFile } from 'node:child_process'
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'

const maxPackageSize = 128 * 1024 * 1024
const maxFiles = 10000

function tar(args: string[]): Promise<string> {
  const file = process.platform === 'win32' ? 'tar.exe' : 'tar'
  return new Promise((resolveOutput, reject) => {
    execFile(
      file,
      args,
      {
        encoding: 'utf8',
        maxBuffer: 8 * 1024 * 1024,
        timeout: 60000,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (!error) resolveOutput(stdout)
        else reject(new Error(stderr.trim() || error.message))
      }
    )
  })
}

function validateEntry(value: string): void {
  const path = value.trim().replace(/\\/g, '/')
  if (!path) return
  if (path.includes('\0') || path.startsWith('/') || /^[A-Za-z]:/.test(path)) {
    throw new Error('The .gmez package contains an invalid path')
  }
  const parts = path.split('/').filter((part) => part && part !== '.')
  if (parts.some((part) => part === '..')) {
    throw new Error('The .gmez package contains an invalid path')
  }
}

async function findDescriptor(folder: string): Promise<string> {
  const descriptors: string[] = []
  let files = 0
  let bytes = 0

  async function visit(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw new Error('.gmez packages cannot contain symbolic links')
      const file = join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(file)
      } else if (entry.isFile()) {
        const info = await stat(file)
        files += 1
        bytes += info.size
        if (files > maxFiles || bytes > maxPackageSize) throw new Error('The .gmez package is too large')
        if (entry.name.toLowerCase().endsWith('.extension.gmx')) descriptors.push(file)
      }
    }
  }

  await visit(folder)
  if (descriptors.length === 0) throw new Error('The .gmez package has no extension descriptor')
  if (descriptors.length > 1) throw new Error('The .gmez package contains multiple extension descriptors')
  return descriptors[0]
}

async function removeTemp(folder: string): Promise<void> {
  const root = resolve(tmpdir())
  const target = resolve(folder)
  const path = relative(root, target)
  if (!path || path.startsWith('..') || isAbsolute(path)) return
  await rm(target, { recursive: true, force: true })
}

export async function withGmezDescriptor<T>(
  source: string,
  action: (descriptor: string) => Promise<T>
): Promise<T> {
  const info = await stat(source)
  if (!info.isFile() || info.size < 1 || info.size > maxPackageSize) {
    throw new Error('Invalid or oversized .gmez package')
  }

  const folder = await mkdtemp(join(tmpdir(), 'opengms-gmez-'))
  try {
    let listing: string
    try {
      listing = await tar(['-tf', source])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Unable to read the .gmez package: ${message}`)
    }
    const entries = listing.split(/\r?\n/).filter(Boolean)
    if (entries.length === 0) throw new Error('The .gmez package is empty')
    if (entries.length > maxFiles) throw new Error('The .gmez package contains too many files')
    entries.forEach(validateEntry)

    try {
      await tar(['-xf', source, '-C', folder])
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Unable to extract the .gmez package: ${message}`)
    }
    return await action(await findDescriptor(folder))
  } finally {
    await removeTemp(folder)
  }
}
