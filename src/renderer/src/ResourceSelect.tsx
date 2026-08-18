import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronDown, ChevronRight, Folder, FolderOpen, Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { Project, ProjectItem } from '../../shared/types'

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>
type FixedOption = { value: string; label: string }

type MenuBox = {
  above: boolean
  edge: number
  left: number
  maxHeight: number
  width: number
}

type ResourceNode =
  | {
      kind: 'group'
      id: string
      name: string
      path: string[]
      items: ResourceNode[]
    }
  | {
      kind: 'resource'
      item: ResourceItem
      path: string[]
    }

function resourceTree(project: Project | null | undefined, options: ResourceItem[]): ResourceNode[] {
  if (!project) return options.map((item) => ({ kind: 'resource', item, path: [] }))

  const allowed = new Map(options.map((item) => [item.id, item]))
  const used = new Set<string>()

  function visit(items: ProjectItem[], path: string[]): ResourceNode[] {
    const result: ResourceNode[] = []
    for (const item of items) {
      if (item.kind === 'group') {
        const nextPath = [...path, item.name]
        const children = visit(item.items, nextPath)
        if (children.length) result.push({ kind: 'group', id: item.id, name: item.name, path, items: children })
        continue
      }
      const option = allowed.get(item.id)
      if (!option) continue
      used.add(item.id)
      result.push({ kind: 'resource', item: option, path })
    }
    return result
  }

  const result = project.groups.flatMap((group) => visit(group.items, []))
  for (const item of options) {
    if (!used.has(item.id)) result.push({ kind: 'resource', item, path: [] })
  }
  return result
}

function filterTree(nodes: ResourceNode[], term: string, ancestorMatches = false): ResourceNode[] {
  if (!term) return nodes
  const result: ResourceNode[] = []
  for (const node of nodes) {
    if (node.kind === 'resource') {
      const name = [...node.path, node.item.name].join(' / ').toLocaleLowerCase()
      if (ancestorMatches || name.includes(term)) result.push(node)
      continue
    }
    const groupMatches = [...node.path, node.name].join(' / ').toLocaleLowerCase().includes(term)
    const items = filterTree(node.items, term, ancestorMatches || groupMatches)
    if (items.length) result.push({ ...node, items })
  }
  return result
}

function resources(nodes: ResourceNode[]): ResourceItem[] {
  const result: ResourceItem[] = []
  for (const node of nodes) {
    if (node.kind === 'resource') result.push(node.item)
    else result.push(...resources(node.items))
  }
  return result
}

export function ResourceSelect({
  value,
  options,
  project,
  fixedOptions = [],
  allowEmpty = true,
  emptyLabel = 'None',
  placeholder = 'Search resources',
  onChange
}: {
  value: string
  options: ResourceItem[]
  project?: Project | null
  fixedOptions?: FixedOption[]
  allowEmpty?: boolean
  emptyLabel?: string
  placeholder?: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [box, setBox] = useState<MenuBox | null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set())
  const term = query.trim().toLocaleLowerCase()
  const tree = useMemo(() => resourceTree(project, options), [options, project])
  const shownTree = useMemo(() => filterTree(tree, term), [term, tree])
  const shown = useMemo(() => resources(shownTree), [shownTree])
  const shownFixed = fixedOptions.filter((item) => `${item.label} ${item.value}`.toLocaleLowerCase().includes(term))
  const missing = value && !fixedOptions.some((item) => item.value === value) && !options.some((item) => item.name === value)

  const position = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(Math.max(rect.width, 280), window.innerWidth - 16)
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))
    const above = window.innerHeight - rect.bottom < 190 && rect.top > window.innerHeight - rect.bottom
    const room = above ? rect.top - 12 : window.innerHeight - rect.bottom - 12
    setBox({
      above,
      edge: above ? window.innerHeight - rect.top + 4 : rect.bottom + 4,
      left,
      maxHeight: Math.max(90, Math.min(300, room)),
      width
    })
  }, [])

  useEffect(() => {
    if (!open) return
    position()

    function close(event: MouseEvent): void {
      const target = event.target as Node
      if (!buttonRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false)
    }

    document.addEventListener('mousedown', close)
    window.addEventListener('resize', position)
    window.addEventListener('scroll', position, true)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('resize', position)
      window.removeEventListener('scroll', position, true)
    }
  }, [open, position])

  function show(): void {
    if (open) {
      setOpen(false)
      return
    }
    setQuery('')
    position()
    setOpen(true)
  }

  function pick(next: string): void {
    onChange(next)
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation()
      setOpen(false)
    } else if (event.key === 'Enter' && term && (shownFixed.length || shown.length)) {
      event.preventDefault()
      pick(shownFixed[0]?.value ?? shown[0].name)
    }
  }

  function toggleGroup(id: string): void {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function renderNodes(nodes: ResourceNode[], depth = 0): React.JSX.Element[] {
    const rows: React.JSX.Element[] = []
    for (const node of nodes) {
      if (node.kind === 'group') {
        const expanded = term.length > 0 || expandedGroups.has(node.id)
        rows.push(
          <button
            type="button"
            className="resource-select-group"
            key={`group:${node.id}`}
            aria-expanded={expanded}
            style={{ paddingLeft: 7 + depth * 15 }}
            onClick={() => toggleGroup(node.id)}
          >
            <span className="resource-select-group-name">
              {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              {expanded ? <FolderOpen size={14} /> : <Folder size={14} />}
              <span>{node.name}</span>
            </span>
          </button>
        )
        if (expanded) rows.push(...renderNodes(node.items, depth + 1))
        continue
      }
      const selected = node.item.name === value
      rows.push(
        <button
          type="button"
          className={selected ? 'selected' : ''}
          key={node.item.id}
          role="option"
          aria-selected={selected}
          style={{ paddingLeft: 10 + depth * 15 }}
          onClick={() => pick(node.item.name)}
        >
          <span className="resource-select-option-name">
            <span>{node.item.name}</span>
            {term && node.path.length > 0 && <small>{node.path.join(' / ')}</small>}
          </span>
          {selected && <Check size={14} />}
        </button>
      )
    }
    return rows
  }

  const style: CSSProperties | undefined = box ? {
    left: box.left,
    width: box.width,
    maxHeight: box.maxHeight,
    ...(box.above ? { bottom: box.edge } : { top: box.edge })
  } : undefined

  return (
    <div className="resource-select">
      <button
        ref={buttonRef}
        type="button"
        className="resource-select-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={show}
      >
        <span className={!value ? 'muted' : ''}>{value || emptyLabel}</span>
        <ChevronDown size={14} />
      </button>
      {open && box && createPortal(
        <div
          ref={menuRef}
          className="resource-select-menu"
          style={style}
          onKeyDown={onKeyDown}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="resource-select-search">
            <Search size={14} />
            <input
              autoFocus
              type="search"
              value={query}
              placeholder={placeholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="resource-select-options" role="listbox">
            {allowEmpty && (!term || emptyLabel.toLocaleLowerCase().includes(term)) && (
              <button type="button" className={!value ? 'selected' : ''} role="option" aria-selected={!value} onClick={() => pick('')}>
                <span>{emptyLabel}</span>{!value && <Check size={14} />}
              </button>
            )}
            {missing && value.toLocaleLowerCase().includes(term) && (
              <button type="button" className="selected missing" role="option" aria-selected="true" onClick={() => pick(value)}>
                <span>{value} <small>(missing)</small></span><Check size={14} />
              </button>
            )}
            {shownFixed.map((item) => (
              <button
                type="button"
                className={item.value === value ? 'selected' : ''}
                key={`fixed:${item.value}`}
                role="option"
                aria-selected={item.value === value}
                onClick={() => pick(item.value)}
              >
                <span>{item.label}</span>{item.value === value && <Check size={14} />}
              </button>
            ))}
            {shownFixed.length > 0 && shownTree.length > 0 && <div className="resource-select-separator" />}
            {renderNodes(shownTree)}
            {!shownFixed.length && !shown.length && !(missing && value.toLocaleLowerCase().includes(term)) && term && (
              <span className="resource-select-empty">No matching resources</span>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
