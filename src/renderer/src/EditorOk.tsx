import { Check } from 'lucide-react'
import type { DockviewPanelApi } from 'dockview-react'
import { saveAndClose } from './close'
import { useSaveState } from './save'

export function EditorOk({ api }: { api: DockviewPanelApi }): React.JSX.Element {
  const { saving } = useSaveState()

  return (
    <button
      className="editor-ok"
      disabled={saving}
      title="Save and close"
      onClick={() => void saveAndClose(api.id, () => api.close())}
    >
      <Check size={15} /> OK
    </button>
  )
}
