import { app } from 'electron'
import {
  existsSync,
  mkdirSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PrefKey, Prefs } from '../shared/types'

const keys = new Set<PrefKey>(['editor', 'layout', 'recentProjects', 'recentColors'])
const folder = app.getPath('userData')
const file = join(folder, 'preferences.json')
const migrateLock = join(folder, 'preferences.migrate.lock')
const writeLock = join(folder, 'preferences.write.lock')
const maxSize = 4 * 1024 * 1024
let migrator = false
let writes: Promise<void> = Promise.resolve()

function errorCode(error: unknown): string | undefined {
  return (error as NodeJS.ErrnoException).code
}

function oldLock(path: string): boolean {
  try {
    return Date.now() - statSync(path).mtimeMs > 30_000
  } catch {
    return false
  }
}

export function preparePrefs(): boolean {
  mkdirSync(folder, { recursive: true })
  if (existsSync(file)) return false

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      writeFileSync(migrateLock, String(process.pid), { flag: 'wx' })
      migrator = true
      return true
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') throw error
      if (!oldLock(migrateLock)) return false
      rmSync(migrateLock, { force: true })
    }
  }
  return false
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitForMigration(): Promise<void> {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (existsSync(file) || !existsSync(migrateLock)) return
    await wait(50)
  }
}

function cleanValue(value: unknown): unknown | undefined {
  try {
    const source = JSON.stringify(value)
    if (source === undefined || source.length > maxSize) return undefined
    return JSON.parse(source) as unknown
  } catch {
    return undefined
  }
}

function cleanPrefs(value: unknown): Prefs {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const result: Prefs = {}
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue
    const next = cleanValue(source[key])
    if (next !== undefined) result[key] = next
  }
  return result
}

async function readPrefs(): Promise<Prefs> {
  try {
    const source = await readFile(file, 'utf8')
    if (source.length > maxSize) return {}
    const data = JSON.parse(source) as { version?: unknown; values?: unknown }
    return data.version === 1 ? cleanPrefs(data.values) : {}
  } catch (error) {
    if (errorCode(error) === 'ENOENT') return {}
    return {}
  }
}

async function acquireWriteLock(): Promise<Awaited<ReturnType<typeof open>>> {
  mkdirSync(folder, { recursive: true })
  for (let attempt = 0; attempt < 200; attempt += 1) {
    try {
      return await open(writeLock, 'wx')
    } catch (error) {
      if (errorCode(error) !== 'EEXIST') throw error
      try {
        if (Date.now() - (await stat(writeLock)).mtimeMs > 30_000) {
          await rm(writeLock, { force: true })
          continue
        }
      } catch {
        // The lock may have been released between checks.
      }
      await wait(10)
    }
  }
  throw new Error('Could not lock the preferences file')
}

async function writePrefs(values: Prefs): Promise<void> {
  const source = `${JSON.stringify({ version: 1, values }, null, 2)}\n`
  if (source.length > maxSize) throw new Error('Preferences are too large')
  const temp = `${file}.${process.pid}.${Date.now()}.tmp`
  try {
    await writeFile(temp, source, 'utf8')
    await rename(temp, file)
  } finally {
    await rm(temp, { force: true }).catch(() => undefined)
  }
}

async function writeUpdate(change: (current: Prefs) => Prefs): Promise<Prefs> {
  const lock = await acquireWriteLock()
  try {
    const next = cleanPrefs(change(await readPrefs()))
    await writePrefs(next)
    return next
  } finally {
    await lock.close().catch(() => undefined)
    await rm(writeLock, { force: true }).catch(() => undefined)
  }
}

function updatePrefs(change: (current: Prefs) => Prefs): Promise<Prefs> {
  const result = writes.then(
    () => writeUpdate(change),
    () => writeUpdate(change)
  )
  writes = result.then(() => undefined, () => undefined)
  return result
}

export async function initPrefs(value: unknown): Promise<Prefs> {
  const legacy = cleanPrefs(value)
  if (!migrator) await waitForMigration()

  try {
    if (!migrator && Object.keys(legacy).length === 0) return readPrefs()
    return await updatePrefs((current) => {
      const next = { ...current }
      for (const key of keys) {
        if (next[key] === undefined && legacy[key] !== undefined) next[key] = legacy[key]
      }
      return next
    })
  } finally {
    if (migrator) {
      migrator = false
      rmSync(migrateLock, { force: true })
    }
  }
}

function safeKey(value: unknown): PrefKey {
  if (typeof value !== 'string' || !keys.has(value as PrefKey)) {
    throw new Error('Invalid preference key')
  }
  return value as PrefKey
}

export async function setPref(keyValue: unknown, value: unknown): Promise<void> {
  const key = safeKey(keyValue)
  const next = cleanValue(value)
  if (next === undefined) throw new Error('Invalid preference value')
  await updatePrefs((current) => ({ ...current, [key]: next }))
}

export async function removePref(keyValue: unknown): Promise<void> {
  const key = safeKey(keyValue)
  await updatePrefs((current) => {
    const next = { ...current }
    delete next[key]
    return next
  })
}
