import type { PrefKey, Prefs } from '../../shared/types'

const legacyKeys: Record<PrefKey, string> = {
  editor: 'opengms.editor-settings.v1',
  layout: 'opengms.layout.v3',
  recentProjects: 'opengms.recent-projects',
  recentColors: 'opengms.recent-colors.v1'
}

let values: Prefs = {}

function legacyPrefs(): Prefs {
  const result: Prefs = {}
  for (const [key, storageKey] of Object.entries(legacyKeys) as Array<[PrefKey, string]>) {
    try {
      const value = window.localStorage.getItem(storageKey)
      if (value !== null) result[key] = JSON.parse(value) as unknown
    } catch {
      // Another process may own the old Chromium storage directory.
    }
  }
  return result
}

export async function initPrefs(): Promise<void> {
  values = await window.openGms.initPrefs(legacyPrefs())
}

export function getPref<T>(key: PrefKey, fallback: T): T {
  return Object.prototype.hasOwnProperty.call(values, key) ? values[key] as T : fallback
}

export function setPref(key: PrefKey, value: unknown): void {
  values = { ...values, [key]: value }
  void window.openGms.setPref(key, value).catch(() => undefined)
}

export function removePref(key: PrefKey): void {
  const next = { ...values }
  delete next[key]
  values = next
  void window.openGms.removePref(key).catch(() => undefined)
}
