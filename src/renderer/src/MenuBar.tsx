import { useEffect, useState } from 'react'
import { DropdownMenu } from 'radix-ui'
import { Check, ChevronRight } from 'lucide-react'
import { AboutDialog } from './AboutDialog'
import { buildProject, cleanProject, runProject, stopProject } from './build'
import { openProjectWithSave } from './close'
import { createNewProject } from './projectNew'
import {
  createAndOpenResource,
  quickResourceNames,
  quickResourceTypes,
  type QuickResourceType
} from './resourceCreate'
import {
  addRecentProject,
  clearRecentProjects,
  loadRecentProjects,
  removeRecentProject,
  type RecentProject
} from './recent'
import { saveProject, saveProjectAs } from './projectSave'
import { useApp } from './store'
import { useSaveState } from './save'

type MenuItem = {
  label?: string
  shortcut?: string
  action?: () => void
  disabled?: boolean
  checked?: boolean
  separator?: boolean
  children?: MenuItem[]
}

type Menu = {
  label: string
  items: MenuItem[]
}

function send(name: string): void {
  window.dispatchEvent(new CustomEvent(name))
}

function MenuEntry({ item }: { item: MenuItem }): React.JSX.Element {
  if (item.separator) return <DropdownMenu.Separator className="menu-separator" />

  if (item.children) {
    return (
      <DropdownMenu.Sub>
        <DropdownMenu.SubTrigger className="menu-item" disabled={item.disabled}>
          <span className="menu-check" />
          <span>{item.label}</span>
          <ChevronRight size={14} />
        </DropdownMenu.SubTrigger>
        <DropdownMenu.Portal>
          <DropdownMenu.SubContent className="menu-popup" sideOffset={6} alignOffset={-5}>
            {item.children.map((child, index) => (
              <MenuEntry key={`${child.label ?? 'separator'}-${index}`} item={child} />
            ))}
          </DropdownMenu.SubContent>
        </DropdownMenu.Portal>
      </DropdownMenu.Sub>
    )
  }

  return (
    <DropdownMenu.Item
      className="menu-item"
      disabled={item.disabled}
      onSelect={() => item.action?.()}
    >
      <span className="menu-check">{item.checked && <Check size={13} />}</span>
      <span>{item.label}</span>
      {item.shortcut && <span className="menu-shortcut">{item.shortcut}</span>}
    </DropdownMenu.Item>
  )
}

export function MenuBar(): React.JSX.Element {
  const openProject = useApp((state) => state.openProject)
  const openProjectFile = useApp((state) => state.openProjectFile)
  const project = useApp((state) => state.project)
  const loading = useApp((state) => state.loading)
  const buildState = useApp((state) => state.buildState)
  const addLog = useApp((state) => state.addLog)
  const saveState = useSaveState()
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [creating, setCreating] = useState<QuickResourceType | null>(null)
  const [recentProjects, setRecentProjects] = useState(loadRecentProjects)
  const [windowPanels, setWindowPanels] = useState({ output: true, resources: true })
  const busy = buildState.phase !== 'idle'

  useEffect(() => {
    if (project && !project.untitled) setRecentProjects(addRecentProject(project))
  }, [project?.name, project?.path, project?.untitled])

  useEffect(() => {
    const update = (event: Event): void => {
      const detail = (event as CustomEvent<{ output: boolean; resources: boolean }>).detail
      if (detail) setWindowPanels(detail)
    }
    window.addEventListener('opengms:window-panels-changed', update)
    const request = window.setTimeout(() => send('opengms:request-window-panels'))
    return () => {
      window.clearTimeout(request)
      window.removeEventListener('opengms:window-panels-changed', update)
    }
  }, [])

  function toggleWindowPanel(panel: 'output' | 'resources'): void {
    window.dispatchEvent(new CustomEvent('opengms:toggle-window-panel', { detail: panel }))
  }

  async function create(type: QuickResourceType): Promise<void> {
    if (loading || busy || creating) return
    setCreating(type)
    try {
      await createAndOpenResource(type)
    } finally {
      setCreating(null)
    }
  }

  async function openRecent(project: RecentProject): Promise<void> {
    if (loading || busy) return
    await openProjectWithSave(async () => {
      if (!(await openProjectFile(project.path))) {
        setRecentProjects(removeRecentProject(project.path))
      }
    })
  }

  const recentItems: MenuItem[] = recentProjects.length > 0
    ? [
        ...recentProjects.map((item) => ({
          label: item.name,
          shortcut: item.path,
          action: () => void openRecent(item),
          disabled: loading || busy
        })),
        { separator: true },
        {
          label: 'Clear Recent Projects',
          action: () => setRecentProjects(clearRecentProjects())
        }
      ]
    : [{ label: 'No recent projects', disabled: true }]

  const menus: Menu[] = [
    {
      label: 'File',
      items: [
        {
          label: 'New Project',
          shortcut: 'Ctrl+N',
          action: () => void createNewProject(),
          disabled: loading || busy
        },
        {
          label: loading ? 'Opening Project…' : 'Open Project…',
          shortcut: 'Ctrl+O',
          action: () => void openProjectWithSave(openProject),
          disabled: loading || busy
        },
        {
          label: 'Open Recent',
          children: recentItems
        },
        { separator: true },
        {
          label: 'Save All',
          shortcut: 'Ctrl+S',
          action: () => void saveProject(),
          disabled:
            !project ||
            saveState.saving ||
            (busy && Boolean(project.untitled)) ||
            (!project.untitled && !saveState.dirty)
        },
        {
          label: 'Save As…',
          shortcut: 'Ctrl+Shift+S',
          action: () => void saveProjectAs(),
          disabled: !project || saveState.saving || busy
        },
        { separator: true },
        { label: 'Preferences…', action: () => send('opengms:open-preferences') },
        { separator: true },
        { label: 'Exit', action: () => window.close() }
      ]
    },
    {
      label: 'Window',
      items: [
        {
          label: 'Output',
          checked: windowPanels.output,
          action: () => toggleWindowPanel('output')
        },
        {
          label: 'Resources',
          checked: windowPanels.resources,
          action: () => toggleWindowPanel('resources')
        },
        { separator: true },
        { label: 'Reset Layout', action: () => send('opengms:reset-layout') }
      ]
    },
    {
      label: 'Resources',
      items: quickResourceTypes.map((type) => ({
        label: `Create ${quickResourceNames[type]}`,
        action: () => void create(type),
        disabled: loading || busy || Boolean(creating)
      }))
    },
    {
      label: 'Scripts',
      items: [
        {
          label: 'Search in Code…',
          shortcut: 'Ctrl+Shift+F',
          action: () => send('opengms:show-code-search'),
          disabled: !project || loading
        }
      ]
    },
    {
      label: 'Run',
      items: [
        {
          label: 'Run',
          shortcut: 'F6',
          action: () => void runProject(),
          disabled: loading || busy || saveState.saving
        },
        {
          label: 'Stop',
          shortcut: 'F8',
          action: () => void stopProject(),
          disabled: !busy || buildState.phase === 'stopping'
        },
        { separator: true },
        {
          label: 'Build',
          action: () => void buildProject(),
          disabled: loading || busy || saveState.saving
        },
        {
          label: 'Clean',
          action: () => void cleanProject(),
          disabled: !project || loading || busy || saveState.saving
        }
      ]
    },
    {
      label: 'Help',
      items: [
        {
          label: 'Open Project Folder',
          disabled: !project,
          action: () => {
            void window.openGms.revealProjectFolder().catch((error: unknown) => {
              const message = error instanceof Error ? error.message : String(error)
              addLog(`Could not open the project folder: ${message}`, 'error')
            })
          }
        },
        { separator: true },
        { label: 'About OpenGMS', action: () => setAboutOpen(true) }
      ]
    }
  ]

  return (
    <>
      <nav className="menu-bar" aria-label="Application menu">
        <span className="brand-mark" aria-hidden="true">
          G
        </span>
        {menus.map((menu) => (
          <DropdownMenu.Root
            key={menu.label}
            modal={false}
            open={openMenu === menu.label}
            onOpenChange={(open) => setOpenMenu((current) =>
              open ? menu.label : current === menu.label ? null : current
            )}
          >
            <DropdownMenu.Trigger
              className="menu-trigger"
              onPointerEnter={() => {
                if (openMenu && openMenu !== menu.label) setOpenMenu(menu.label)
              }}
            >
              {menu.label}
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                className="menu-popup"
                sideOffset={3}
                align="start"
                onCloseAutoFocus={(event) => event.preventDefault()}
              >
                {menu.items.map((item, index) => (
                  <MenuEntry key={`${item.label ?? 'separator'}-${index}`} item={item} />
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ))}
      </nav>
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </>
  )
}
