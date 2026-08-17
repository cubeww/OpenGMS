import { useEffect, useMemo, useState } from 'react'
import {
  BoxSelect,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  FileInput,
  Image as ImageIcon,
  Images,
  Pencil,
  Play,
  Save as SaveIcon,
  Shield,
  Square,
  StopCircle
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type {
  ProjectItem,
  SpriteBoxMode,
  SpriteData,
  SpriteFrame,
  SpriteShape,
  StripImage
} from '../../../shared/types'
import { assetUrl } from '../assets'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'
import { StripDialog } from '../StripDialog'
import type { ImageParams } from './ImagePanel'

type SpriteItem = Extract<ProjectItem, { kind: 'resource' }>

export type SpriteParams = {
  item: SpriteItem
  projectPath: string
}

type Page = 'properties' | 'mask' | 'frames'

const shapeNames: Record<SpriteShape, string> = {
  precise: 'Precise',
  rectangle: 'Rectangle',
  ellipse: 'Ellipse',
  diamond: 'Diamond'
}

function copySprite(sprite: SpriteData): SpriteData {
  return { ...sprite, box: { ...sprite.box }, frames: sprite.frames.map((frame) => ({ ...frame })) }
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load one of the sprite frames.'))
    image.src = source
  })
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function FrameImage({
  frame,
  projectPath,
  version,
  className
}: {
  frame?: SpriteFrame
  projectPath: string
  version: number
  className?: string
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)

  useEffect(() => setFailed(false), [frame?.image, projectPath, version])

  if (!frame?.image || frame.missing || failed) {
    return (
      <span className={`sprite-image-fallback ${className ?? ''}`}>
        <ImageIcon size={28} />
        <small>Image unavailable</small>
      </span>
    )
  }

  return (
    <img
      className={className}
      src={assetUrl(frame.image, projectPath, version)}
      alt={`Frame ${frame.index}`}
      draggable={false}
      onError={() => setFailed(true)}
    />
  )
}

function FieldGroup({
  title,
  icon: Icon,
  children
}: {
  title: string
  icon: typeof ImageIcon
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="sprite-group">
      <h3>
        <Icon size={15} /> {title}
      </h3>
      <div className="sprite-group-body">{children}</div>
    </section>
  )
}

function NumberField({
  label,
  value,
  disabled,
  onChange
}: {
  label: string
  value: number
  disabled?: boolean
  onChange: (value: number) => void
}): React.JSX.Element {
  return (
    <label className="sprite-number-field">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  )
}

function CheckField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}): React.JSX.Element {
  return (
    <label className="sprite-check-field">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  )
}

function Preview({
  sprite,
  frame,
  framePos,
  projectPath,
  version,
  showMask,
  onStep
}: {
  sprite: SpriteData
  frame?: SpriteFrame
  framePos: number
  projectPath: string
  version: number
  showMask?: boolean
  onStep: (step: number) => void
}): React.JSX.Element {
  const size = Math.max(sprite.width, sprite.height, 1)
  const scale = Math.max(1, Math.min(14, Math.floor(480 / size)))
  const box = sprite.boxMode === 'full'
    ? { left: 0, top: 0, right: sprite.width - 1, bottom: sprite.height - 1 }
    : sprite.box
  const boxStyle = {
    left: `${(box.left / Math.max(sprite.width, 1)) * 100}%`,
    top: `${(box.top / Math.max(sprite.height, 1)) * 100}%`,
    width: `${((box.right - box.left + 1) / Math.max(sprite.width, 1)) * 100}%`,
    height: `${((box.bottom - box.top + 1) / Math.max(sprite.height, 1)) * 100}%`
  }
  const originStyle = {
    left: `${(sprite.xOrigin / Math.max(sprite.width, 1)) * 100}%`,
    top: `${(sprite.yOrigin / Math.max(sprite.height, 1)) * 100}%`
  }

  return (
    <section className="sprite-preview">
      <div className="sprite-preview-head">
        <div>
          <strong>Preview</strong>
          <span>{sprite.width} × {sprite.height}px</span>
        </div>
        <span className="sprite-zoom">{scale * 100}%</span>
      </div>
      <div className="sprite-stage">
        <div
          className="sprite-stage-image"
          style={{ width: sprite.width * scale, height: sprite.height * scale }}
        >
          <FrameImage
            frame={frame}
            projectPath={projectPath}
            version={version}
            className="sprite-preview-image"
          />
          {showMask && <span className={`mask-box ${sprite.shape}`} style={boxStyle} />}
          {!showMask && <span className="origin-point" style={originStyle} />}
        </div>
      </div>
      <div className="sprite-frame-nav">
        <button onClick={() => onStep(-1)} disabled={sprite.frames.length < 2} title="Previous frame">
          <ChevronLeft size={16} />
        </button>
        <span>Frame {sprite.frames.length ? framePos + 1 : 0} of {sprite.frames.length}</span>
        <button onClick={() => onStep(1)} disabled={sprite.frames.length < 2} title="Next frame">
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  )
}

export function SpritePanel({ params, api }: IDockviewPanelProps<SpriteParams>): React.JSX.Element {
  const source = params.item.sprite
  const [sprite, setSprite] = useState<SpriteData | null>(() => (source ? copySprite(source) : null))
  const [saved, setSaved] = useState(() => (source ? JSON.stringify(source) : ''))
  const [page, setPage] = useState<Page>('properties')
  const [framePos, setFramePos] = useState(0)
  const [showMask, setShowMask] = useState(true)
  const [playing, setPlaying] = useState(false)
  const [saving, setSaving] = useState(false)
  const [strip, setStrip] = useState<StripImage | null>(null)
  const [stripLoading, setStripLoading] = useState(false)
  const [stripSaving, setStripSaving] = useState(false)
  const imageVersion = useApp((state) => state.imageVersion)
  const updateSprite = useApp((state) => state.updateSprite)
  const refreshImages = useApp((state) => state.refreshImages)
  const addLog = useApp((state) => state.addLog)
  const dirty = sprite ? JSON.stringify(sprite) !== saved : false
  useSave(api.id, dirty, save)

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  useEffect(() => {
    if (!playing || !sprite || sprite.frames.length < 2) return
    const timer = window.setInterval(
      () => setFramePos((current) => (current + 1) % sprite.frames.length),
      180
    )
    return () => window.clearInterval(timer)
  }, [playing, sprite])

  useEffect(() => {
    if (sprite && framePos >= sprite.frames.length) setFramePos(Math.max(0, sprite.frames.length - 1))
  }, [framePos, sprite])

  const frame = sprite?.frames[framePos]
  const memory = useMemo(
    () => sprite ? Math.ceil((sprite.width * sprite.height * 4 * sprite.frames.length) / 1024) : 0,
    [sprite]
  )

  if (!sprite) {
    return (
      <div className="sprite-empty">
        <ImageIcon size={34} />
        <strong>Sprite data is unavailable</strong>
        <span>The sprite descriptor is missing or could not be parsed.</span>
      </div>
    )
  }
  const data = sprite

  function patch(values: Partial<SpriteData>): void {
    setSprite((current) => current ? { ...current, ...values } : current)
  }

  function patchBox(name: keyof SpriteData['box'], value: number): void {
    setSprite((current) =>
      current ? { ...current, box: { ...current.box, [name]: value } } : current
    )
  }

  function stepFrame(step: number): void {
    if (!data.frames.length) return
    setFramePos((current) => (current + step + data.frames.length) % data.frames.length)
  }

  function openImage(target = frame): void {
    if (!target?.image || target.missing) return
    const detail: ImageParams = {
      resource: 'sprite',
      itemId: params.item.id,
      name: params.item.name,
      projectPath: params.projectPath,
      width: data.width,
      height: data.height,
      frame: target
    }
    window.dispatchEvent(new CustomEvent('opengms:open-image', { detail }))
  }

  async function chooseStrip(): Promise<void> {
    if (stripLoading) return
    setStripLoading(true)
    try {
      const image = await window.openGms.openSpriteStrip()
      if (image) setStrip(image)
    } catch (error) {
      addLog(`Failed to load sprite strip: ${errorText(error)}`)
    } finally {
      setStripLoading(false)
    }
  }

  async function importStrip(images: string[]): Promise<void> {
    try {
      const result = await window.openGms.writeSpriteFrames(params.item.file, images)
      setSprite((current) => current ? {
        ...current,
        width: result.width,
        height: result.height,
        box: {
          left: 0,
          top: 0,
          right: result.width - 1,
          bottom: result.height - 1
        },
        frames: result.frames
      } : current)
      setFramePos(0)
      setPlaying(false)
      setStrip(null)
      addLog(`Loaded ${result.frames.length} frames into ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to load sprite strip: ${errorText(error)}`)
      throw error
    }
  }

  async function saveStrip(): Promise<void> {
    if (stripSaving || data.frames.length === 0) return

    const width = data.width * data.frames.length
    const height = data.height
    if (data.width < 1 || height < 1 || width > 32767 || width * height > 64 * 1024 * 1024) {
      addLog('Failed to save sprite strip: the combined image is too large.')
      return
    }

    setStripSaving(true)
    try {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not create the strip canvas.')
      context.imageSmoothingEnabled = false
      context.clearRect(0, 0, width, height)

      for (let index = 0; index < data.frames.length; index += 1) {
        const item = data.frames[index]
        if (!item.image || item.missing) throw new Error(`Frame ${item.index} is unavailable.`)
        const image = await loadImage(assetUrl(item.image, params.projectPath, imageVersion))
        context.drawImage(image, 0, 0, image.width, image.height, index * data.width, 0, data.width, data.height)
      }

      const path = await window.openGms.saveSpriteStrip(params.item.name, canvas.toDataURL('image/png'))
      if (path) addLog(`Saved sprite strip to ${path}.`)
    } catch (error) {
      addLog(`Failed to save sprite strip: ${errorText(error)}`)
    } finally {
      setStripSaving(false)
    }
  }

  async function save(): Promise<void> {
    if (!sprite || !dirty || saving) return
    const next = copySprite(sprite)
    setSaving(true)
    try {
      await window.openGms.saveSprite(params.item.file, next)
      updateSprite(params.item.id, next)
      refreshImages()
      setSaved(JSON.stringify(next))
      addLog(`Saved sprite ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save sprite ${params.item.name}: ${error instanceof Error ? error.message : 'Save failed'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="sprite-editor">
      <header className="sprite-editor-head">
        <div className="sprite-title">
          <span className="sprite-title-icon"><ImageIcon size={18} /></span>
          <div><strong>{params.item.name}</strong><small>Sprite resource</small></div>
        </div>
        <nav className="sprite-pages" aria-label="Sprite editor pages">
          <button className={page === 'properties' ? 'active' : ''} onClick={() => setPage('properties')}>
            <CircleDot size={15} /> Properties
          </button>
          <button className={page === 'mask' ? 'active' : ''} onClick={() => setPage('mask')}>
            <Shield size={15} /> Collision Mask
          </button>
          <button className={page === 'frames' ? 'active' : ''} onClick={() => setPage('frames')}>
            <Images size={15} /> Frames
          </button>
        </nav>
        <EditorOk api={api} />
      </header>

      {page === 'properties' && (
        <div className="sprite-properties">
          <div className="sprite-settings">
            <FieldGroup title="Sprite" icon={ImageIcon}>
              <label className="sprite-text-field">
                <span>Name</span>
                <ResourceName item={params.item} />
              </label>
              <div className="sprite-stats">
                <span><strong>{sprite.width}</strong> Width</span>
                <span><strong>{sprite.height}</strong> Height</span>
                <span><strong>{sprite.frames.length}</strong> Frames</span>
              </div>
              <button className="sprite-wide-button" onClick={() => setPage('frames')}>
                <Pencil size={15} /> Edit Frames
              </button>
            </FieldGroup>

            <FieldGroup title="Origin" icon={CircleDot}>
              <div className="sprite-number-grid">
                <NumberField label="X" value={sprite.xOrigin} onChange={(xOrigin) => patch({ xOrigin })} />
                <NumberField label="Y" value={sprite.yOrigin} onChange={(yOrigin) => patch({ yOrigin })} />
              </div>
              <button
                className="sprite-wide-button secondary"
                onClick={() => patch({
                  xOrigin: Math.floor(sprite.width / 2),
                  yOrigin: Math.floor(sprite.height / 2)
                })}
              >
                Center Origin
              </button>
            </FieldGroup>

            <FieldGroup title="Collision Checking" icon={Shield}>
              <CheckField
                label="Precise collision checking"
                checked={sprite.shape === 'precise'}
                onChange={(checked) => patch({ shape: checked ? 'precise' : 'rectangle' })}
              />
              <CheckField
                label="Separate collision masks"
                checked={sprite.separateMasks}
                onChange={(separateMasks) => patch({ separateMasks })}
              />
              <button className="sprite-wide-button" onClick={() => setPage('mask')}>
                <BoxSelect size={15} /> Modify Mask
              </button>
            </FieldGroup>

            <FieldGroup title="Texture" icon={Square}>
              <CheckField label="Tile horizontally" checked={sprite.tileX} onChange={(tileX) => patch({ tileX })} />
              <CheckField label="Tile vertically" checked={sprite.tileY} onChange={(tileY) => patch({ tileY })} />
              <CheckField label="Used for 3D" checked={sprite.for3D} onChange={(for3D) => patch({ for3D })} />
              <label className="sprite-text-field">
                <span>Texture Group</span>
                <select value={sprite.textureGroup} onChange={(event) => patch({ textureGroup: event.target.value })}>
                  <option value={sprite.textureGroup}>{sprite.textureGroup === '0' ? 'Default' : sprite.textureGroup}</option>
                </select>
              </label>
            </FieldGroup>
          </div>
          <Preview
            sprite={sprite}
            frame={frame}
            framePos={framePos}
            projectPath={params.projectPath}
            version={imageVersion}
            onStep={stepFrame}
          />
        </div>
      )}

      {page === 'mask' && (
        <div className="sprite-mask-page">
          <div className="mask-settings">
            <FieldGroup title="Image" icon={ImageIcon}>
              <div className="sprite-stats compact">
                <span><strong>{sprite.width} × {sprite.height}</strong> Size</span>
                <span><strong>{sprite.frames.length}</strong> Frames</span>
              </div>
              <CheckField label="Show collision mask" checked={showMask} onChange={setShowMask} />
            </FieldGroup>

            <FieldGroup title="Bounding Box" icon={BoxSelect}>
              {(['auto', 'full', 'manual'] as SpriteBoxMode[]).map((mode) => (
                <label className="sprite-radio" key={mode}>
                  <input
                    type="radio"
                    name={`box-${params.item.id}`}
                    checked={sprite.boxMode === mode}
                    onChange={() => patch({ boxMode: mode })}
                  />
                  <span>{mode === 'auto' ? 'Automatic' : mode === 'full' ? 'Full image' : 'Manual'}</span>
                </label>
              ))}
              <div className="sprite-number-grid mask-box-fields">
                <NumberField label="Left" value={sprite.box.left} disabled={sprite.boxMode !== 'manual'} onChange={(value) => patchBox('left', value)} />
                <NumberField label="Right" value={sprite.box.right} disabled={sprite.boxMode !== 'manual'} onChange={(value) => patchBox('right', value)} />
                <NumberField label="Top" value={sprite.box.top} disabled={sprite.boxMode !== 'manual'} onChange={(value) => patchBox('top', value)} />
                <NumberField label="Bottom" value={sprite.box.bottom} disabled={sprite.boxMode !== 'manual'} onChange={(value) => patchBox('bottom', value)} />
              </div>
            </FieldGroup>

            <FieldGroup title="General" icon={Shield}>
              <CheckField label="Separate collision masks" checked={sprite.separateMasks} onChange={(separateMasks) => patch({ separateMasks })} />
              <label className="sprite-range-field">
                <span>Alpha Tolerance <strong>{sprite.tolerance}</strong></span>
                <input type="range" min="0" max="255" value={sprite.tolerance} onChange={(event) => patch({ tolerance: Number(event.target.value) })} />
              </label>
            </FieldGroup>

            <FieldGroup title="Shape" icon={CircleDot}>
              {(Object.keys(shapeNames) as SpriteShape[]).map((shape) => (
                <label className="sprite-radio" key={shape}>
                  <input
                    type="radio"
                    name={`shape-${params.item.id}`}
                    checked={sprite.shape === shape}
                    onChange={() => patch({ shape })}
                  />
                  <span>{shapeNames[shape]}</span>
                </label>
              ))}
            </FieldGroup>
          </div>
          <Preview
            sprite={sprite}
            frame={frame}
            framePos={framePos}
            projectPath={params.projectPath}
            version={imageVersion}
            showMask={showMask}
            onStep={stepFrame}
          />
        </div>
      )}

      {page === 'frames' && (
        <div className="sprite-frames-page">
          <div className="frame-toolbar">
            <button onClick={() => setPlaying((value) => !value)} disabled={sprite.frames.length < 2}>
              {playing ? <StopCircle size={15} /> : <Play size={15} />} {playing ? 'Stop' : 'Play'}
            </button>
            <span className="frame-toolbar-rule" />
            <button onClick={() => openImage()} disabled={!frame?.image || frame.missing}>
              <Pencil size={15} /> Open Image
            </button>
            <span className="frame-toolbar-rule" />
            <button onClick={() => void chooseStrip()} disabled={stripLoading}>
              <FileInput size={15} /> {stripLoading ? 'Loading…' : 'Load Strip'}
            </button>
            <button onClick={() => void saveStrip()} disabled={stripSaving || sprite.frames.length === 0}>
              <SaveIcon size={15} /> {stripSaving ? 'Saving…' : 'Save Strip'}
            </button>
          </div>
          <div className="frame-workspace with-preview">
            <div className="frame-side-preview">
              <FrameImage frame={frame} projectPath={params.projectPath} version={imageVersion} />
              <span>Frame {sprite.frames.length ? framePos + 1 : 0}</span>
            </div>
            <div className="frame-grid">
              {sprite.frames.map((item, index) => (
                <button
                  className={`frame-card ${index === framePos ? 'selected' : ''}`}
                  key={`${item.index}-${item.image ?? 'missing'}`}
                  onClick={() => setFramePos(index)}
                  onDoubleClick={() => openImage(item)}
                  title={item.image ?? 'Missing image'}
                >
                  <span className="frame-thumb">
                    <FrameImage frame={item} projectPath={params.projectPath} version={imageVersion} />
                  </span>
                  <span>Frame {item.index}</span>
                  {item.missing && <small>Missing</small>}
                </button>
              ))}
              {sprite.frames.length === 0 && <div className="frame-empty">This sprite has no frames.</div>}
            </div>
          </div>
          <footer className="frame-status">
            <span>Frames: {sprite.frames.length}</span>
            <span>Size: {sprite.width} × {sprite.height}</span>
            <span>Memory: {memory} KB</span>
          </footer>
        </div>
      )}
      {strip && (
        <StripDialog
          source={strip}
          frameWidth={sprite.width}
          frameHeight={sprite.height}
          onCancel={() => setStrip(null)}
          onImport={importStrip}
        />
      )}
    </section>
  )
}
