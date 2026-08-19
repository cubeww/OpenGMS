import { useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Popover } from 'radix-ui'

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

  function changeOpen(next: boolean): void {
    if (next) setQuery('')
    setOpen(next)
  }

  return (
    <Popover.Root open={open} onOpenChange={changeOpen}>
      <div className={`font-picker ${open ? 'open' : ''}`}>
        <Popover.Trigger asChild>
          <button
            type="button"
            className="font-picker-trigger"
            aria-haspopup="listbox"
            aria-expanded={open}
            title={loading ? 'Loading installed fonts…' : `${all.length} installed font families`}
          >
            <span style={{ fontFamily: fontStyle(value) }}>{value || 'Select a font'}</span>
            <ChevronDown size={14} />
          </button>
        </Popover.Trigger>
      </div>

      <Popover.Portal>
        <Popover.Content
          className="font-picker-popup"
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            window.requestAnimationFrame(() => searchRef.current?.focus())
          }}
        >
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
