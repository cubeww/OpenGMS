import { useState } from 'react'
import {
  AppWindow,
  Box,
  Broom,
  FilePlus2,
  FolderOpen,
  Ghost,
  Hammer,
  Hourglass,
  Image as ImageIcon,
  Play,
  Route,
  Save,
  ScrollText,
  Settings2,
  Sparkles,
  Square,
  Type,
  Volume2,
  type LucideIcon
} from 'lucide-react'
import { buildProject, cleanProject, runProject, stopProject } from './build'
import { createNewProject } from './projectNew'
import { useApp } from './store'
import { openProjectWithSave } from './close'
import {
  createAndOpenResource,
  type QuickResourceType
} from './resourceCreate'
import { saveProject } from './projectSave'
import { useSaveState } from './save'

type ToolButtonProps = {
  label: string
  className?: string
  disabled?: boolean
  onClick?: () => void
  children: React.ReactNode
}

function ToolButton({ label, className, disabled, onClick, children }: ToolButtonProps): React.JSX.Element {
  return (
    <button className={`tool-button ${className ?? ''}`} title={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

const quickResources: Array<{ type: QuickResourceType; name: string; icon: LucideIcon }> = [
  { type: 'sprite', name: 'Sprite', icon: Ghost },
  { type: 'sound', name: 'Sound', icon: Volume2 },
  { type: 'background', name: 'Background', icon: ImageIcon },
  { type: 'path', name: 'Path', icon: Route },
  { type: 'script', name: 'Script', icon: ScrollText },
  { type: 'shader', name: 'Shader', icon: Sparkles },
  { type: 'font', name: 'Font', icon: Type },
  { type: 'timeline', name: 'Timeline', icon: Hourglass },
  { type: 'object', name: 'Object', icon: Box },
  { type: 'room', name: 'Room', icon: AppWindow }
]

export function ToolBar(): React.JSX.Element {
  const openProject = useApp((state) => state.openProject)
  const project = useApp((state) => state.project)
  const config = useApp((state) => state.config)
  const setConfig = useApp((state) => state.setConfig)
  const loading = useApp((state) => state.loading)
  const buildState = useApp((state) => state.buildState)
  const [creating, setCreating] = useState<QuickResourceType | null>(null)
  const saveState = useSaveState()
  const configs = project?.configs.length ? project.configs : ['Default']
  const busy = buildState.phase !== 'idle'

  async function create(type: QuickResourceType): Promise<void> {
    if (loading || busy || creating) return
    setCreating(type)
    try {
      await createAndOpenResource(type)
    } finally {
      setCreating(null)
    }
  }

  return (
    <div className="tool-bar">
      <div className="tool-group">
        <ToolButton
          label="New Project (Ctrl+N)"
          disabled={loading || busy}
          onClick={() => void createNewProject()}
        >
          <FilePlus2 size={18} />
        </ToolButton>
        <ToolButton label="Open Project" disabled={loading || busy} onClick={() => void openProjectWithSave(openProject)}>
          <FolderOpen size={18} />
        </ToolButton>
        <ToolButton
          label="Save Project (Ctrl+S)"
          disabled={
            !project ||
            saveState.saving ||
            (busy && Boolean(project.untitled)) ||
            (!project.untitled && !saveState.dirty)
          }
          onClick={() => void saveProject()}
        >
          <Save size={18} />
        </ToolButton>
      </div>
      <span className="tool-separator" />
      <div className="tool-group">
        <ToolButton
          label="Run (F5)"
          disabled={loading || busy || saveState.saving}
          onClick={() => void runProject()}
        >
          <Play size={18} fill="currentColor" />
        </ToolButton>
        <ToolButton
          label="Stop (F8)"
          disabled={!busy || buildState.phase === 'stopping'}
          onClick={() => void stopProject()}
        >
          <Square size={16} fill="currentColor" />
        </ToolButton>
        <ToolButton
          label="Build"
          disabled={loading || busy || saveState.saving}
          onClick={() => void buildProject()}
        >
          <Hammer size={18} />
        </ToolButton>
        <ToolButton
          label="Clean"
          disabled={!project || loading || busy || saveState.saving}
          onClick={() => void cleanProject()}
        >
          <Broom size={18} />
        </ToolButton>
      </div>
      <span className="tool-separator" />
      <div className="tool-group resource-tools" aria-label="Create resources">
        {quickResources.map(({ type, name, icon: Icon }) => (
          <ToolButton
            key={type}
            label={`Create ${name}`}
            className={`tool-resource ${type}`}
            disabled={loading || busy || Boolean(creating)}
            onClick={() => void create(type)}
          >
            <Icon size={17} />
          </ToolButton>
        ))}
      </div>
      <span className="tool-separator" />
      <label className="tool-field">
        <span>Target</span>
        <select aria-label="Target" defaultValue="windows" disabled={!project || busy}>
          <option value="windows">Windows</option>
        </select>
      </label>
      <label className="tool-field config-field">
        <span>Configuration</span>
        <select
          aria-label="Configuration"
          value={config || configs[0]}
          disabled={!project || busy}
          onChange={(event) => setConfig(event.target.value)}
        >
          {configs.map((config) => (
            <option value={config} key={config}>
              {config}
            </option>
          ))}
        </select>
      </label>
      <button
        className="manage-button"
        disabled={!project || busy}
        onClick={() => window.dispatchEvent(new CustomEvent('opengms:open-configs'))}
      >
        <Settings2 size={15} /> Manage
      </button>
    </div>
  )
}
