import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ClipboardPaste, Copy, Pipette, RotateCcw } from 'lucide-react'
import { Popover } from 'radix-ui'

type Rgb = { r: number; g: number; b: number }
type Hsv = { h: number; s: number; v: number }

type EyeDropperApi = {
  open: () => Promise<{ sRGBHex: string }>
}

type EyeDropperHost = typeof window & {
  EyeDropper?: new () => EyeDropperApi
}

const presets = [
  '#000000', '#FFFFFF', '#7F8C8D', '#C7CCD1', '#5B6573', '#2C3440',
  '#C0392B', '#E74C3C', '#E67E22', '#F1C40F', '#84C341', '#27AE60',
  '#16A085', '#00A8C6', '#2878C7', '#4D55CC', '#8E44AD', '#D252B2',
  '#795548', '#F3A6A6', '#6EA8FE', '#80CBC4', '#FFCB6B', '#E6A96B'
]

const recentKey = 'opengms.recent-colors.v1'

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value))
}

function component(value: number): string {
  return Math.round(clamp(value)).toString(16).padStart(2, '0')
}

function rgbToHex({ r, g, b }: Rgb): string {
  return `#${component(r)}${component(g)}${component(b)}`.toUpperCase()
}

function parseColor(value: string): Rgb | null {
  const text = value.trim()
  const short = text.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (short) {
    return {
      r: Number.parseInt(short[1] + short[1], 16),
      g: Number.parseInt(short[2] + short[2], 16),
      b: Number.parseInt(short[3] + short[3], 16)
    }
  }
  const hex = text.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  if (hex) {
    return {
      r: Number.parseInt(hex[1], 16),
      g: Number.parseInt(hex[2], 16),
      b: Number.parseInt(hex[3], 16)
    }
  }
  const rgb = text.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
  if (!rgb) return null
  const result = { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) }
  return Object.values(result).every((item) => item >= 0 && item <= 255) ? result : null
}

function normalize(value: string): string {
  return rgbToHex(parseColor(value) ?? { r: 0, g: 0, b: 0 })
}

function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  let h = 0
  if (delta) {
    if (max === red) h = 60 * (((green - blue) / delta) % 6)
    else if (max === green) h = 60 * ((blue - red) / delta + 2)
    else h = 60 * ((red - green) / delta + 4)
  }
  if (h < 0) h += 360
  return { h, s: max ? delta / max : 0, v: max }
}

function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const hue = ((h % 360) + 360) % 360
  const chroma = v * s
  const part = hue / 60
  const x = chroma * (1 - Math.abs(part % 2 - 1))
  const [red, green, blue] = part < 1 ? [chroma, x, 0]
    : part < 2 ? [x, chroma, 0]
      : part < 3 ? [0, chroma, x]
        : part < 4 ? [0, x, chroma]
          : part < 5 ? [x, 0, chroma]
            : [chroma, 0, x]
  const match = v - chroma
  return { r: (red + match) * 255, g: (green + match) * 255, b: (blue + match) * 255 }
}

function readRecent(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(recentKey) ?? '[]')
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string' && parseColor(item) !== null).map(normalize).slice(0, 8)
      : []
  } catch {
    return []
  }
}

function saveRecent(colors: string[]): void {
  try {
    localStorage.setItem(recentKey, JSON.stringify(colors))
  } catch {
    // Recent colors are optional.
  }
}

export function ColorPicker({
  value,
  onChange,
  label = 'Choose color'
}: {
  value: string
  onChange: (value: string) => void
  label?: string
}): React.JSX.Element {
  const color = normalize(value)
  const rgb = parseColor(color)!
  const hsv = rgbToHsv(rgb)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(color)
  const [hue, setHue] = useState(hsv.h)
  const [previous, setPrevious] = useState(color)
  const [recent, setRecent] = useState(readRecent)
  const [message, setMessage] = useState('')
  const svRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setText(color)
    const next = rgbToHsv(parseColor(color)!)
    if (next.s > 0) setHue(next.h)
  }, [color])

  function change(next: Rgb): void {
    setMessage('')
    onChange(rgbToHex(next))
  }

  function setOpenState(next: boolean): void {
    if (next) {
      setPrevious(color)
      setMessage('')
    } else {
      const colors = [color, ...recent.filter((item) => item !== color)].slice(0, 8)
      setRecent(colors)
      saveRecent(colors)
    }
    setOpen(next)
  }

  function setSv(event: React.PointerEvent<HTMLDivElement>): void {
    const rect = svRef.current?.getBoundingClientRect()
    if (!rect) return
    const saturation = clamp((event.clientX - rect.left) / rect.width, 0, 1)
    const brightness = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1)
    change(hsvToRgb({ h: hue, s: saturation, v: brightness }))
  }

  function startSv(event: React.PointerEvent<HTMLDivElement>): void {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setSv(event)
  }

  function moveSv(event: React.PointerEvent<HTMLDivElement>): void {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setSv(event)
  }

  function commitText(): void {
    const next = parseColor(text)
    if (!next) {
      setText(color)
      setMessage('Invalid color')
      return
    }
    setText(rgbToHex(next))
    change(next)
  }

  function setChannel(channel: keyof Rgb, next: number): void {
    change({ ...rgb, [channel]: Math.round(clamp(next)) })
  }

  async function copyColor(): Promise<void> {
    try {
      await navigator.clipboard.writeText(color)
      setMessage('Copied')
    } catch {
      setMessage('Copy failed')
    }
  }

  async function pasteColor(): Promise<void> {
    try {
      const next = parseColor(await navigator.clipboard.readText())
      if (!next) {
        setMessage('Clipboard has no color')
        return
      }
      change(next)
    } catch {
      setMessage('Paste failed')
    }
  }

  async function pickScreenColor(): Promise<void> {
    const EyeDropper = (window as EyeDropperHost).EyeDropper
    if (!EyeDropper) return
    try {
      const result = await new EyeDropper().open()
      const next = parseColor(result.sRGBHex)
      if (next) change(next)
    } catch {
      // Closing the eyedropper is not an error.
    }
  }

  const shownHue = hsv.s > 0 ? hsv.h : hue
  const EyeDropper = (window as EyeDropperHost).EyeDropper

  return (
    <Popover.Root open={open} onOpenChange={setOpenState}>
      <Popover.Trigger asChild>
        <button className="color-picker-trigger" type="button" aria-label={label} title={label}>
          <span className="color-picker-swatch" style={{ background: color }} />
          <code>{color}</code>
          <ChevronDown size={13} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="color-picker-popup" side="right" align="start" sideOffset={8} collisionPadding={10}>
          <div
            ref={svRef}
            className="color-picker-sv"
            style={{ backgroundColor: `hsl(${shownHue} 100% 50%)` }}
            onPointerDown={startSv}
            onPointerMove={moveSv}
          >
            <span style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: color }} />
          </div>

          <label className="color-picker-hue">
            <span>Hue</span>
            <input
              type="range"
              min={0}
              max={359}
              value={Math.round(shownHue)}
              onChange={(event) => {
                const next = Number(event.target.value)
                setHue(next)
                change(hsvToRgb({ ...hsv, h: next }))
              }}
            />
          </label>

          <div className="color-picker-fields">
            <label className="hex"><span>HEX</span><input value={text} maxLength={9} spellCheck={false} onChange={(event) => setText(event.target.value)} onBlur={commitText} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
            {(['r', 'g', 'b'] as const).map((channel) => (
              <label key={channel}><span>{channel.toUpperCase()}</span><input type="number" min={0} max={255} value={rgb[channel]} onChange={(event) => setChannel(channel, Number(event.target.value))} /></label>
            ))}
          </div>

          <section className="color-picker-section">
            <span>Preset colors</span>
            <div className="color-picker-palette">
              {presets.map((item) => <button key={item} type="button" className={item === color ? 'selected' : ''} style={{ background: item }} title={item} onClick={() => change(parseColor(item)!)} />)}
            </div>
          </section>

          {recent.length > 0 && (
            <section className="color-picker-section compact">
              <span>Recent colors</span>
              <div className="color-picker-palette recent">
                {recent.map((item) => <button key={item} type="button" className={item === color ? 'selected' : ''} style={{ background: item }} title={item} onClick={() => change(parseColor(item)!)} />)}
              </div>
            </section>
          )}

          <footer className="color-picker-actions">
            <button type="button" title="Restore previous color" onClick={() => change(parseColor(previous)!)}><RotateCcw size={14} /></button>
            <button type="button" title="Copy color" onClick={() => void copyColor()}><Copy size={14} /></button>
            <button type="button" title="Paste color" onClick={() => void pasteColor()}><ClipboardPaste size={14} /></button>
            {EyeDropper && <button type="button" title="Pick a color from the screen" onClick={() => void pickScreenColor()}><Pipette size={14} /></button>}
            <span>{message || `${Math.round(hsv.h)}° · ${Math.round(hsv.s * 100)}% · ${Math.round(hsv.v * 100)}%`}</span>
          </footer>
          <Popover.Arrow className="color-picker-arrow" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
