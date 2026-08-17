import { useEffect, useRef, useState } from 'react'
import {
  Droplets,
  Eraser,
  Grid3X3,
  PaintBucket,
  Pencil,
  Pipette,
  Undo2,
  ZoomIn
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { SpriteFrame } from '../../../shared/types'
import { assetUrl } from '../assets'
import { EditorOk } from '../EditorOk'
import { useSave } from '../save'
import { useApp } from '../store'

export type ImageParams = {
  resource: 'sprite' | 'background'
  itemId: string
  name: string
  projectPath: string
  width: number
  height: number
  frame: SpriteFrame
}

type Tool = 'pencil' | 'eraser' | 'fill' | 'picker'
type Point = { x: number; y: number }

const palette = [
  '#000000', '#ffffff', '#7f8c8d', '#c7ccd1',
  '#c0392b', '#e67e22', '#f1c40f', '#84c341',
  '#16a085', '#00a8c6', '#2878c7', '#4d55cc',
  '#8e44ad', '#d252b2', '#795548', '#f3a6a6'
]

function rgba(color: string, opacity: number): [number, number, number, number] {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
    opacity
  ]
}

function hex(red: number, green: number, blue: number): string {
  return `#${[red, green, blue].map((value) => value.toString(16).padStart(2, '0')).join('')}`
}

export function ImagePanel({ params, api }: IDockviewPanelProps<ImageParams>): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const lastRef = useRef<Point | null>(null)
  const historyRef = useRef<ImageData[]>([])
  const editVersion = useRef(0)
  const initialVersion = useRef(useApp.getState().imageVersion)
  const [tool, setTool] = useState<Tool>('pencil')
  const [color, setColor] = useState('#000000')
  const [opacity, setOpacity] = useState(255)
  const [brush, setBrush] = useState(1)
  const [zoom, setZoom] = useState(() =>
    Math.max(1, Math.min(20, Math.floor(540 / Math.max(params.width, params.height, 1))))
  )
  const [grid, setGrid] = useState(true)
  const [size, setSize] = useState({ width: params.width, height: params.height })
  const [position, setPosition] = useState<Point>({ x: 0, y: 0 })
  const [ready, setReady] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [canUndo, setCanUndo] = useState(false)
  const [status, setStatus] = useState('Loading image…')
  const refreshImages = useApp((state) => state.refreshImages)
  const addLog = useApp((state) => state.addLog)
  const background = params.resource === 'background'
  const imageTitle = background ? `${params.name} · Image` : `${params.name} · Frame ${params.frame.index}`
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${imageTitle}${dirty ? ' •' : ''}`)
  }, [api, dirty, imageTitle])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !params.frame.image) return
    let active = true
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      if (!active) return
      const width = image.naturalWidth || params.width
      const height = image.naturalHeight || params.height
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, width, height)
      context.drawImage(image, 0, 0)
      setSize({ width, height })
      setReady(true)
      setDirty(false)
      setStatus('Ready')
      historyRef.current = []
      setCanUndo(false)
      window.requestAnimationFrame(syncPreview)
    }
    image.onerror = () => {
      if (!active) return
      setReady(false)
      setStatus('Could not load this image')
    }
    image.src = assetUrl(params.frame.image, params.projectPath, initialVersion.current)
    return () => {
      active = false
    }
  }, [params.frame.image, params.height, params.projectPath, params.width])

  function context(): CanvasRenderingContext2D | null {
    return canvasRef.current?.getContext('2d', { willReadFrequently: true }) ?? null
  }

  function syncPreview(): void {
    const canvas = canvasRef.current
    const preview = previewRef.current
    if (!canvas || !preview) return
    preview.width = canvas.width
    preview.height = canvas.height
    const previewContext = preview.getContext('2d')
    if (!previewContext) return
    previewContext.imageSmoothingEnabled = false
    previewContext.clearRect(0, 0, preview.width, preview.height)
    previewContext.drawImage(canvas, 0, 0)
  }

  function point(event: React.PointerEvent<HTMLCanvasElement>): Point {
    const canvas = event.currentTarget
    const bounds = canvas.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(canvas.width - 1, Math.floor(((event.clientX - bounds.left) / bounds.width) * canvas.width))),
      y: Math.max(0, Math.min(canvas.height - 1, Math.floor(((event.clientY - bounds.top) / bounds.height) * canvas.height)))
    }
  }

  function snapshot(): void {
    const canvas = canvasRef.current
    const paint = context()
    if (!canvas || !paint) return
    historyRef.current = [...historyRef.current.slice(-29), paint.getImageData(0, 0, canvas.width, canvas.height)]
    setCanUndo(true)
  }

  function stamp(target: Point): void {
    const paint = context()
    if (!paint) return
    const offset = Math.floor(brush / 2)
    if (tool === 'eraser') {
      paint.clearRect(target.x - offset, target.y - offset, brush, brush)
    } else {
      const [red, green, blue] = rgba(color, opacity)
      paint.fillStyle = `rgba(${red}, ${green}, ${blue}, ${opacity / 255})`
      paint.fillRect(target.x - offset, target.y - offset, brush, brush)
    }
  }

  function line(from: Point, to: Point): void {
    let x = from.x
    let y = from.y
    const dx = Math.abs(to.x - from.x)
    const sx = from.x < to.x ? 1 : -1
    const dy = -Math.abs(to.y - from.y)
    const sy = from.y < to.y ? 1 : -1
    let error = dx + dy

    while (true) {
      stamp({ x, y })
      if (x === to.x && y === to.y) break
      const twice = error * 2
      if (twice >= dy) {
        error += dy
        x += sx
      }
      if (twice <= dx) {
        error += dx
        y += sy
      }
    }
  }

  function fill(target: Point): void {
    const canvas = canvasRef.current
    const paint = context()
    if (!canvas || !paint) return
    const image = paint.getImageData(0, 0, canvas.width, canvas.height)
    const pixels = image.data
    const start = (target.y * canvas.width + target.x) * 4
    const before = [pixels[start], pixels[start + 1], pixels[start + 2], pixels[start + 3]]
    const after = rgba(color, opacity)
    if (before.every((value, index) => value === after[index])) return

    const matches = (offset: number): boolean => before.every((value, index) => pixels[offset + index] === value)
    const stack: Point[] = [target]
    while (stack.length) {
      const next = stack.pop()!
      if (next.x < 0 || next.y < 0 || next.x >= canvas.width || next.y >= canvas.height) continue
      const offset = (next.y * canvas.width + next.x) * 4
      if (!matches(offset)) continue
      pixels[offset] = after[0]
      pixels[offset + 1] = after[1]
      pixels[offset + 2] = after[2]
      pixels[offset + 3] = after[3]
      stack.push(
        { x: next.x - 1, y: next.y },
        { x: next.x + 1, y: next.y },
        { x: next.x, y: next.y - 1 },
        { x: next.x, y: next.y + 1 }
      )
    }
    paint.putImageData(image, 0, 0)
  }

  function changed(): void {
    editVersion.current += 1
    setDirty(true)
    syncPreview()
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (!ready) return
    const target = point(event)
    setPosition(target)

    if (tool === 'picker') {
      const pixel = context()?.getImageData(target.x, target.y, 1, 1).data
      if (pixel) {
        setColor(hex(pixel[0], pixel[1], pixel[2]))
        setOpacity(pixel[3])
      }
      return
    }

    snapshot()
    if (tool === 'fill') {
      fill(target)
      changed()
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    drawingRef.current = true
    lastRef.current = target
    stamp(target)
    changed()
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    const target = point(event)
    setPosition(target)
    if (!drawingRef.current || !lastRef.current) return
    line(lastRef.current, target)
    lastRef.current = target
    changed()
  }

  function pointerUp(): void {
    drawingRef.current = false
    lastRef.current = null
  }

  function undo(): void {
    const previous = historyRef.current.pop()
    const paint = context()
    if (!previous || !paint) return
    paint.putImageData(previous, 0, 0)
    setCanUndo(historyRef.current.length > 0)
    changed()
  }

  async function save(): Promise<void> {
    const canvas = canvasRef.current
    if (!canvas || !params.frame.image || !dirty || saving) return
    const version = editVersion.current
    setSaving(true)
    try {
      await window.openGms.saveImage(params.frame.image, canvas.toDataURL('image/png'))
      if (editVersion.current === version) setDirty(false)
      refreshImages()
      addLog(background
        ? `Saved background image ${params.name}.`
        : `Saved ${params.name} frame ${params.frame.index}.`)
    } catch (error) {
      addLog(`Failed to save ${imageTitle}: ${error instanceof Error ? error.message : 'Save failed'}`)
    } finally {
      setSaving(false)
    }
  }

  const tools: Array<{ id: Tool; label: string; icon: typeof Pencil }> = [
    { id: 'pencil', label: 'Pencil', icon: Pencil },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'fill', label: 'Fill', icon: PaintBucket },
    { id: 'picker', label: 'Color Picker', icon: Pipette }
  ]

  return (
    <section className="image-editor">
      <header className="image-toolbar">
        <button onClick={undo} disabled={!canUndo}>
          <Undo2 size={16} /> Undo
        </button>
        <span className="image-tool-rule" />
        <button className={grid ? 'active' : ''} onClick={() => setGrid((value) => !value)}>
          <Grid3X3 size={16} /> Pixel Grid
        </button>
        <label className="image-zoom-toolbar">
          <ZoomIn size={16} />
          <input type="range" min="1" max="32" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} />
          <span>{zoom * 100}%</span>
        </label>
        <EditorOk api={api} />
      </header>

      <div className="image-editor-body">
        <aside className="paint-tools">
          <h3>Tools</h3>
          <div className="paint-tool-grid">
            {tools.map(({ id, label, icon: Icon }) => (
              <button key={id} className={tool === id ? 'active' : ''} title={label} onClick={() => setTool(id)}>
                <Icon size={18} />
              </button>
            ))}
          </div>
          <h3>Brush Size</h3>
          <div className="brush-grid">
            {[1, 2, 3, 5].map((value) => (
              <button key={value} className={brush === value ? 'active' : ''} onClick={() => setBrush(value)} title={`${value}px`}>
                <span style={{ width: Math.min(14, value * 3), height: Math.min(14, value * 3) }} />
              </button>
            ))}
          </div>
        </aside>

        <main className="image-workspace">
          <div className="image-canvas-center">
            <div
              className="image-canvas-wrap checkerboard"
              style={{ width: size.width * zoom, height: size.height * zoom, '--pixel': `${zoom}px` } as React.CSSProperties}
            >
              <canvas
                ref={canvasRef}
                className="paint-canvas"
                style={{ width: size.width * zoom, height: size.height * zoom }}
                onPointerDown={pointerDown}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
                onPointerCancel={pointerUp}
                onContextMenu={(event) => event.preventDefault()}
              />
              {grid && zoom >= 6 && <span className="pixel-grid" />}
            </div>
          </div>
        </main>

        <aside className="paint-inspector">
          <section>
            <h3><Droplets size={14} /> Color</h3>
            <div className="paint-color-row">
              <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
              <code>{color.toUpperCase()}</code>
            </div>
            <div className="paint-palette">
              {palette.map((value) => (
                <button
                  key={value}
                  className={color === value ? 'active' : ''}
                  style={{ background: value }}
                  title={value}
                  onClick={() => setColor(value)}
                />
              ))}
            </div>
          </section>
          <section>
            <h3>Opacity <span>{opacity}</span></h3>
            <input type="range" min="0" max="255" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
          </section>
          <section className="paint-preview">
            <h3>Preview</h3>
            <div className="checkerboard"><canvas ref={previewRef} /></div>
          </section>
          <section className="image-info">
            <span>{size.width} × {size.height}px</span>
            <span>{background ? 'Background' : `Frame ${params.frame.index}`}</span>
          </section>
        </aside>
      </div>

      <footer className="image-status">
        <span>{status}</span>
        <span>({position.x}, {position.y})</span>
        <span>Zoom: {zoom * 100}%</span>
        <span>Size: {size.width} × {size.height}</span>
      </footer>
    </section>
  )
}
