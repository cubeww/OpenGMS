import { createRoot } from 'react-dom/client'
import 'dockview-react/dist/styles/dockview.css'
import './styles.css'
import { App } from './App'

const root = document.getElementById('root')

if (!root) throw new Error('Root element not found')

createRoot(root).render(<App />)
