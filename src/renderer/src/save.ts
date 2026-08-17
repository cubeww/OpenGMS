import { useEffect, useRef, useSyncExternalStore } from 'react'
import { useApp } from './store'

type SaveTask = {
  dirty: boolean
  save: () => void | Promise<void>
}

export type SaveState = {
  dirty: boolean
  saving: boolean
  count: number
}

const tasks = new Map<string, SaveTask>()
const listeners = new Set<() => void>()
let saving = false
let snapshot: SaveState = { dirty: false, saving: false, count: 0 }

function update(): void {
  const count = [...tasks.values()].filter((task) => task.dirty).length
  const next = { dirty: count > 0, saving, count }
  if (
    next.dirty === snapshot.dirty &&
    next.saving === snapshot.saving &&
    next.count === snapshot.count
  ) return

  snapshot = next
  listeners.forEach((listener) => listener())
}

async function settle(): Promise<void> {
  await Promise.resolve()
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
  await new Promise<void>((resolve) => window.setTimeout(resolve, 0))
}

async function run(id: string): Promise<boolean> {
  const task = tasks.get(id)
  if (!task?.dirty) return true

  let completed = false
  try {
    await task.save()
    completed = true
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    useApp.getState().addLog(`Could not save ${id}: ${message}`)
  }

  await settle()
  const saved = !tasks.get(id)?.dirty
  if (completed && saved) useApp.getState().markProjectDirty()
  return saved
}

export function useSave(id: string, dirty: boolean, save: () => void | Promise<void>): void {
  const saveRef = useRef(save)
  saveRef.current = save

  useEffect(() => {
    tasks.set(id, { dirty, save: () => saveRef.current() })
    update()

    return () => {
      tasks.delete(id)
      update()
    }
  }, [id])

  useEffect(() => {
    const task = tasks.get(id)
    if (!task) return
    task.dirty = dirty
    update()
  }, [dirty, id])
}

export function useSaveState(): SaveState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
    () => snapshot
  )
}

export function getSaveState(): SaveState {
  return snapshot
}

export function isDirty(id: string): boolean {
  return tasks.get(id)?.dirty ?? false
}

export async function saveOne(id: string): Promise<boolean> {
  if (saving) return false

  saving = true
  update()
  try {
    return await run(id)
  } finally {
    saving = false
    update()
  }
}

export async function saveAll(): Promise<boolean> {
  if (saving) return false

  const queue = [...tasks.entries()].filter(([, task]) => task.dirty)
  if (!queue.length) return true

  saving = true
  update()

  let saved = true
  try {
    for (const [id] of queue) {
      if (!(await run(id))) saved = false
    }
  } finally {
    saving = false
    update()
  }

  return saved
}
