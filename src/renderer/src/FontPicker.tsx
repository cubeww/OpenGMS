import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'

type FontPickerProps = {
  value: string
  options: string[]
  loading?: boolean
  onChange: (value: string) => void
}

function fontStyle(name: string): string {
  return `'${name.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}', sans-serif`
}

export function FontPicker({
  value,
  options,
  loading = false,
  onChange
}: FontPickerProps): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const all = useMemo(() => [...new Map(
    [...options, value].filter(Boolean).map((font) => [font.toLocaleLowerCase(), font])
  ).values()].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  ), [options, value])
  const text = query.trim().toLocaleLowerCase()
  const shown = text
    ? all.filter((font) => font.toLocaleLowerCase().includes(text))
    : all

  useEffect(() => {
    if (!open) return
    function outside(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function key(event: KeyboardEvent): void {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('pointerdown', outside, true)
    window.addEventListener('keydown', key)
    window.requestAnimationFrame(() => searchRef.current?.focus())
    return () => {
      window.removeEventListener('pointerdown', outside, true)
      window.removeEventListener('keydown', key)
    }
  }, [open])

  function toggle(): void {
    setOpen((current) => {
      if (!current) setQuery('')
      return !current
    })
  }

  return (
    <div ref={rootRef} className={`font-picker ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="font-picker-trigger"
        onClick={toggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={loading ? 'Loading installed fonts…' : `${all.length} installed font families`}
      >
        <span style={{ fontFamily: fontStyle(value) }}>{value || 'Select a font'}</span>
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="font-picker-popup">
          <label className="font-picker-search">
            <Search size={14} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' || !shown[0]) return
                event.preventDefault()
                onChange(shown[0])
                setOpen(false)
              }}
              placeholder="Search installed fonts"
              spellCheck={false}
            />
          </label>
          <div className="font-picker-list" role="listbox" aria-label="Installed fonts">
            {shown.map((font) => (
              <button
                type="button"
                role="option"
                aria-selected={font === value}
                className={font === value ? 'selected' : ''}
                key={font}
                onClick={() => {
                  onChange(font)
                  setOpen(false)
                }}
              >
                <span style={{ fontFamily: fontStyle(font) }}>{font}</span>
                {font === value && <Check size={13} />}
              </button>
            ))}
            {!loading && shown.length === 0 && <div className="font-picker-empty">No matching fonts</div>}
            {loading && all.length === 0 && <div className="font-picker-empty">Loading installed fonts…</div>}
          </div>
          <footer>{shown.length} of {all.length} installed font families</footer>
        </div>
      )}
    </div>
  )
}
