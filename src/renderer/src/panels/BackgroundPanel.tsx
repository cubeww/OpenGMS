import { useEffect, useMemo, useState } from 'react'
import {
  Grid3X3,
  Image as ImageIcon,
  Layers3,
  Pencil,
  Upload,
  type LucideIcon
} from 'lucide-react'
import type { IDockviewPanelProps } from 'dockview-react'
import type { BackgroundData, ProjectItem } from '../../../shared/types'
import { assetUrl } from '../assets'
import { EditorOk } from '../EditorOk'
import { ResourceName } from '../ResourceName'
import { useSave } from '../save'
import { useApp } from '../store'
import type { ImageParams } from './ImagePanel'

type BackgroundItem = Extract<ProjectItem, { kind: 'resource' }>

export type BackgroundParams = {
  item: BackgroundItem
  projectPath: string
}

function copyBackground(background: BackgroundData): BackgroundData {
  return { ...background }
}

function FieldGroup({
  title,
  icon: Icon,
  className,
  children
}: {
  title: string
  icon: LucideIcon
  className?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <section className={`sprite-group ${className ?? ''}`}>
      <h3><Icon size={15} /> {title}</h3>
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

function BackgroundPreview({
  background,
  projectPath,
  version
}: {
  background: BackgroundData
  projectPath: string
  version: number
}): React.JSX.Element {
  const [failed, setFailed] = useState(false)
  const width = Math.max(background.width, 1)
  const height = Math.max(background.height, 1)
  const stepX = Math.max(1, background.tileWidth + background.tileHSeparation)
  const stepY = Math.max(1, background.tileHeight + background.tileVSeparation)

  useEffect(() => setFailed(false), [background.image, projectPath, version])

  const gridStyle = {
    '--tile-width': `${(stepX / width) * 100}%`,
    '--tile-height': `${(stepY / height) * 100}%`,
    '--tile-x': `${(background.tileXOffset / width) * 100}%`,
    '--tile-y': `${(background.tileYOffset / height) * 100}%`
  } as React.CSSProperties

  return (
    <section className="background-preview">
      <div className="background-preview-head">
        <div>
          <strong>Preview</strong>
          <span>{background.width} × {background.height}px</span>
        </div>
        {background.tileSet && (
          <span className="background-tile-badge">
            <Grid3X3 size={12} /> {background.tileWidth} × {background.tileHeight}
          </span>
        )}
      </div>
      <div className="background-stage">
        {!background.image || background.missing || failed ? (
          <div className="background-image-fallback">
            <ImageIcon size={36} />
            <strong>Image unavailable</strong>
            <span>Load a PNG image to edit this background.</span>
          </div>
        ) : (
          <div
            className="background-canvas checkerboard"
            style={{
              width: background.width,
              aspectRatio: `${width} / ${height}`
            }}
          >
            <img
              src={assetUrl(background.image, projectPath, version)}
              alt={background.data || 'Background image'}
              draggable={false}
              onError={() => setFailed(true)}
            />
            {background.tileSet && <span className="background-tile-grid" style={gridStyle} />}
          </div>
        )}
      </div>
      <footer className="background-preview-foot">
        <span>{background.data || 'No image'}</span>
        <span>{background.tileSet ? 'Tile set' : 'Background image'}</span>
      </footer>
    </section>
  )
}

export function BackgroundPanel({
  params,
  api
}: IDockviewPanelProps<BackgroundParams>): React.JSX.Element {
  const source = params.item.background
  const [background, setBackground] = useState<BackgroundData | null>(() =>
    source ? copyBackground(source) : null
  )
  const [saved, setSaved] = useState(() => (source ? JSON.stringify(source) : ''))
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const imageVersion = useApp((state) => state.imageVersion)
  const updateBackground = useApp((state) => state.updateBackground)
  const refreshImages = useApp((state) => state.refreshImages)
  const addLog = useApp((state) => state.addLog)
  const dirty = background ? JSON.stringify(background) !== saved : false
  useSave(api.id, dirty, save)
  const memory = useMemo(
    () => background ? Math.ceil((background.width * background.height * 4) / 1024) : 0,
    [background]
  )

  useEffect(() => {
    api.setTitle(`${params.item.name}${dirty ? ' •' : ''}`)
  }, [api, dirty, params.item.name])

  if (!background) {
    return (
      <div className="background-empty">
        <Layers3 size={34} />
        <strong>Background data is unavailable</strong>
        <span>The background descriptor is missing or could not be parsed.</span>
      </div>
    )
  }
  const data = background

  function patch(values: Partial<BackgroundData>): void {
    setBackground((current) => current ? { ...current, ...values } : current)
  }

  function openImage(): void {
    if (!data.image || data.missing) return
    const detail: ImageParams = {
      resource: 'background',
      itemId: params.item.id,
      name: params.item.name,
      projectPath: params.projectPath,
      width: data.width,
      height: data.height,
      frame: { index: 0, image: data.image, missing: false }
    }
    window.dispatchEvent(new CustomEvent('opengms:open-image', { detail }))
  }

  async function loadImage(): Promise<void> {
    if (loading) return
    setLoading(true)
    try {
      const file = await window.openGms.replaceBackground(params.item.file)
      if (!file) return
      patch({ ...file, missing: false })
      refreshImages()
      addLog(`Loaded image for background ${params.item.name}.`)
    } catch (error) {
      addLog(`Could not load image for background ${params.item.name}: ${error instanceof Error ? error.message : 'Operation failed'}`)
    } finally {
      setLoading(false)
    }
  }

  async function save(): Promise<void> {
    if (!background || !dirty || saving) return
    const next = copyBackground(background)
    setSaving(true)
    try {
      await window.openGms.saveBackground(params.item.file, next)
      updateBackground(params.item.id, next)
      setSaved(JSON.stringify(next))
      addLog(`Saved background ${params.item.name}.`)
    } catch (error) {
      addLog(`Failed to save background ${params.item.name}: ${error instanceof Error ? error.message : 'Save failed'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="background-editor">
      <header className="background-editor-head">
        <div className="sprite-title background-title">
          <span className="sprite-title-icon"><Layers3 size={18} /></span>
          <div><strong>{params.item.name}</strong><small>Background resource</small></div>
        </div>
        <EditorOk api={api} />
      </header>

      <div className="background-editor-body">
        <div className="background-settings">
          <FieldGroup title="Background" icon={ImageIcon} className="background-source-group">
            <label className="sprite-text-field">
              <span>Name</span>
              <ResourceName item={params.item} />
            </label>
            <label className="sprite-text-field">
              <span>Image</span>
              <input value={data.data || 'No image'} readOnly />
            </label>
            <div className="background-actions">
              <button className="sprite-wide-button" onClick={() => void loadImage()} disabled={loading}>
                <Upload size={15} /> {loading ? 'Loading…' : 'Load Background'}
              </button>
              <button className="sprite-wide-button" onClick={openImage} disabled={!data.image || data.missing}>
                <Pencil size={15} /> Edit Background
              </button>
            </div>
            <div className="sprite-stats">
              <span><strong>{data.width}</strong> Width</span>
              <span><strong>{data.height}</strong> Height</span>
              <span><strong>{memory} KB</strong> Memory</span>
            </div>
          </FieldGroup>

          <FieldGroup title="Texture" icon={Layers3}>
            <CheckField label="Tile horizontally" checked={data.tileX} onChange={(tileX) => patch({ tileX })} />
            <CheckField label="Tile vertically" checked={data.tileY} onChange={(tileY) => patch({ tileY })} />
            <CheckField label="Used for 3D" checked={data.for3D} onChange={(for3D) => patch({ for3D })} />
            <label className="sprite-text-field">
              <span>Texture Group</span>
              <select value={data.textureGroup} onChange={(event) => patch({ textureGroup: event.target.value })}>
                <option value={data.textureGroup}>{data.textureGroup === '0' ? 'Default' : data.textureGroup}</option>
              </select>
            </label>
          </FieldGroup>

          <FieldGroup title="Tile Set" icon={Grid3X3}>
            <CheckField label="Use as tile set" checked={data.tileSet} onChange={(tileSet) => patch({ tileSet })} />
            <div className="sprite-number-grid">
              <NumberField label="Tile Width" value={data.tileWidth} disabled={!data.tileSet} onChange={(tileWidth) => patch({ tileWidth })} />
              <NumberField label="Tile Height" value={data.tileHeight} disabled={!data.tileSet} onChange={(tileHeight) => patch({ tileHeight })} />
              <NumberField label="Horizontal Offset" value={data.tileXOffset} disabled={!data.tileSet} onChange={(tileXOffset) => patch({ tileXOffset })} />
              <NumberField label="Vertical Offset" value={data.tileYOffset} disabled={!data.tileSet} onChange={(tileYOffset) => patch({ tileYOffset })} />
              <NumberField label="Horizontal Separation" value={data.tileHSeparation} disabled={!data.tileSet} onChange={(tileHSeparation) => patch({ tileHSeparation })} />
              <NumberField label="Vertical Separation" value={data.tileVSeparation} disabled={!data.tileSet} onChange={(tileVSeparation) => patch({ tileVSeparation })} />
            </div>
          </FieldGroup>
        </div>

        <BackgroundPreview
          background={data}
          projectPath={params.projectPath}
          version={imageVersion}
        />
      </div>
    </section>
  )
}
