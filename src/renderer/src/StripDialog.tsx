import { Check, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StripImage } from '../../shared/types'

type Values = {
  count: number
  perRow: number
  width: number
  height: number
  cellX: number
  cellY: number
  pixelX: number
  pixelY: number
  separationX: number
  separationY: number
}

type Cell = {
  x: number
  y: number
  width: number
  height: number
}

function Field({
  label,
  value,
  min = 0,
  max = 32767,
  onChange
}: {
  label: string
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="strip-field">
      <span>{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number.parseInt(event.target.value, 10) || 0)}
      />
    </label>
  )
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not decode the strip image.'))
    image.src = source
  })
}

function initialValues(source: StripImage, width: number, height: number): Values {
  const frameWidth = width > 0 && width <= source.width ? width : source.width
  const frameHeight = height > 0 && height <= source.height ? height : source.height
  const columns = Math.max(1, Math.floor(source.width / frameWidth))
  const rows = Math.max(1, Math.floor(source.height / frameHeight))
  return {
    count: Math.min(2048, columns * rows),
    perRow: columns,
    width: frameWidth,
    height: frameHeight,
    cellX: 0,
    cellY: 0,
    pixelX: 0,
    pixelY: 0,
    separationX: 0,
    separationY: 0
  }
}

export function StripDialog({
  source,
  frameWidth,
  frameHeight,
  onCancel,
  onImport
}: {
  source: StripImage
  frameWidth: number
  frameHeight: number
  onCancel: () => void
  onImport: (images: string[]) => Promise<void>
}): React.JSX.Element {
  const [values, setValues] = useState(() => initialValues(source, frameWidth, frameHeight))
  const [working, setWorking] = useState(false)
  const [error, setError] = useState('')

  const cells = useMemo<Cell[]>(() => Array.from({ length: Math.max(0, values.count) }, (_, index) => {
    const column = (index % Math.max(1, values.perRow)) + values.cellX
    const row = Math.floor(index / Math.max(1, values.perRow)) + values.cellY
    return {
      x: values.pixelX + column * (values.width + values.separationX),
      y: values.pixelY + row * (values.height + values.separationY),
      width: values.width,
      height: values.height
    }
  }), [values])

  const invalid = values.count < 1 || values.count > 2048 ||
    values.perRow < 1 || values.perRow > 2048 ||
    values.width < 1 || values.height < 1 ||
    values.width > 32767 || values.height > 32767 ||
    values.cellX < 0 || values.cellY < 0 || values.pixelX < 0 || values.pixelY < 0 ||
    values.separationX < 0 || values.separationY < 0 ||
    values.count * values.width * values.height > 64 * 1024 * 1024 ||
    cells.some((cell) => (
      cell.x < 0 || cell.y < 0 ||
      cell.x + cell.width > source.width ||
      cell.y + cell.height > source.height
    ))

  useEffect(() => {
    function keyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape' && !working) onCancel()
    }
    window.addEventListener('keydown', keyDown)
    return () => window.removeEventListener('keydown', keyDown)
  }, [onCancel, working])

  function patch(change: Partial<Values>): void {
    setValues((current) => ({ ...current, ...change }))
    setError('')
  }

  async function submit(): Promise<void> {
    if (invalid || working) return
    setWorking(true)
    setError('')
    try {
      const image = await loadImage(source.dataUrl)
      const frames: string[] = []
      for (const cell of cells) {
        const canvas = document.createElement('canvas')
        canvas.width = cell.width
        canvas.height = cell.height
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Could not create the frame canvas.')
        context.imageSmoothingEnabled = false
        context.clearRect(0, 0, cell.width, cell.height)
        context.drawImage(
          image,
          cell.x,
          cell.y,
          cell.width,
          cell.height,
          0,
          0,
          cell.width,
          cell.height
        )
        frames.push(canvas.toDataURL('image/png'))
      }
      await onImport(frames)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load the strip.')
      setWorking(false)
    }
  }

  return createPortal(
    <div
      className="strip-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !working) onCancel()
      }}
    >
      <section className="strip-dialog" role="dialog" aria-modal="true" aria-labelledby="strip-dialog-title">
        <header>
          <div>
            <strong id="strip-dialog-title">Load Sprite Strip</strong>
            <span>{source.name} · {source.width} × {source.height}px</span>
          </div>
          <button type="button" disabled={working} onClick={onCancel} aria-label="Cancel loading strip">
            <X size={17} />
          </button>
        </header>
        <div className="strip-dialog-body">
          <aside className="strip-settings">
            <Field label="Number of images" value={values.count} min={1} max={2048} onChange={(count) => patch({ count })} />
            <Field label="Images per row" value={values.perRow} min={1} max={2048} onChange={(perRow) => patch({ perRow })} />
            <div className="strip-field-rule" />
            <Field label="Image width" value={values.width} min={1} onChange={(width) => patch({ width })} />
            <Field label="Image height" value={values.height} min={1} onChange={(height) => patch({ height })} />
            <div className="strip-field-rule" />
            <Field label="Horizontal cell offset" value={values.cellX} onChange={(cellX) => patch({ cellX })} />
            <Field label="Vertical cell offset" value={values.cellY} onChange={(cellY) => patch({ cellY })} />
            <Field label="Horizontal pixel offset" value={values.pixelX} onChange={(pixelX) => patch({ pixelX })} />
            <Field label="Vertical pixel offset" value={values.pixelY} onChange={(pixelY) => patch({ pixelY })} />
            <Field label="Horizontal separation" value={values.separationX} onChange={(separationX) => patch({ separationX })} />
            <Field label="Vertical separation" value={values.separationY} onChange={(separationY) => patch({ separationY })} />
          </aside>
          <div className="strip-preview-scroll">
            <div className="strip-source" style={{ width: source.width, height: source.height }}>
              <img src={source.dataUrl} width={source.width} height={source.height} alt="Sprite strip" draggable={false} />
              {cells.slice(0, 512).map((cell, index) => {
                const outside = cell.x < 0 || cell.y < 0 || cell.x + cell.width > source.width || cell.y + cell.height > source.height
                return (
                  <span
                    className={`strip-cell ${outside ? 'outside' : ''}`}
                    key={index}
                    style={{ left: cell.x, top: cell.y, width: cell.width, height: cell.height }}
                  >
                    <small>{index + 1}</small>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
        <footer>
          <span className={invalid ? 'error' : ''}>
            {error || (invalid ? 'One or more frames fall outside the source image.' : `${values.count} frames · ${values.width} × ${values.height}px`)}
          </span>
          <button type="button" className="secondary" disabled={working} onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" disabled={invalid || working} onClick={() => void submit()}>
            <Check size={16} /> {working ? 'Loading…' : 'Load'}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  )
}
