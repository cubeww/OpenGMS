import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { ProjectItem } from '../../shared/types'

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

type MenuBox = {
  above: boolean
  edge: number
  left: number
  maxHeight: number
  width: number
}

export function ResourceSelect({
  value,
  options,
  emptyLabel = 'None',
  placeholder = 'Search resources',
  onChange
}: {
  value: string
  options: ResourceItem[]
  emptyLabel?: string
  placeholder?: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [box, setBox] = useState<MenuBox | null>(null)
  const term = query.trim().toLocaleLowerCase()
  const shown = options.filter((item) => item.name.toLocaleLowerCase().includes(term))
  const missing = value && !options.some((item) => item.name === value)

  const position = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const width = Math.min(Math.max(rect.width, 240), window.innerWidth - 16)
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
    } else if (event.key === 'Enter' && term && shown.length) {
      event.preventDefault()
      pick(shown[0].name)
    }
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
            {(!term || emptyLabel.toLocaleLowerCase().includes(term)) && (
              <button type="button" className={!value ? 'selected' : ''} role="option" aria-selected={!value} onClick={() => pick('')}>
                <span>{emptyLabel}</span>{!value && <Check size={14} />}
              </button>
            )}
            {missing && value.toLocaleLowerCase().includes(term) && (
              <button type="button" className="selected missing" role="option" aria-selected="true" onClick={() => pick(value)}>
                <span>{value} <small>(missing)</small></span><Check size={14} />
              </button>
            )}
            {shown.map((item) => (
              <button
                type="button"
                className={item.name === value ? 'selected' : ''}
                key={item.id}
                role="option"
                aria-selected={item.name === value}
                onClick={() => pick(item.name)}
              >
                <span>{item.name}</span>{item.name === value && <Check size={14} />}
              </button>
            ))}
            {!shown.length && !(missing && value.toLocaleLowerCase().includes(term)) && term && (
              <span className="resource-select-empty">No matching resources</span>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
