import { saveBeforeClose } from './projectSave'
import { getSaveState, isDirty, saveOne } from './save'
import { useApp } from './store'

export async function closeEditor(
  id: string,
  title: string,
  close: () => void
): Promise<void> {
  if (!isDirty(id)) {
    close()
    return
  }

  const choice = await window.openGms.confirmUnsaved(title, 1)
  if (choice === 'cancel') return
  if (choice === 'discard') {
    close()
    return
  }

  if (await saveOne(id)) close()
}

export async function saveAndClose(id: string, close: () => void): Promise<void> {
  if (!isDirty(id) || await saveOne(id)) close()
}

export async function confirmAll(): Promise<boolean> {
  const editorCount = getSaveState().count
  const count = editorCount || (useApp.getState().projectDirty ? 1 : 0)
  if (!count) return true

  const choice = await window.openGms.confirmUnsaved('OpenGMS project', count, true)
  if (choice === 'cancel') return false
  if (choice === 'discard') return true
  return (await saveBeforeClose()) === 'saved'
}

export async function openProjectWithSave(openProject: () => Promise<void>): Promise<void> {
  if (await confirmAll()) await openProject()
}
