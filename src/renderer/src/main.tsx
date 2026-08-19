import { createRoot } from 'react-dom/client'
import 'dockview-react/dist/styles/dockview.css'
import './styles.css'
import { App } from './App'
import { initEditorSettings } from './editorSettings'
import { initPrefs } from './prefs'

const root = document.getElementById('root')

if (!root) throw new Error('Root element not found')

void initPrefs().catch(() => undefined).then(() => {
  initEditorSettings()
  createRoot(root).render(<App />)
})
