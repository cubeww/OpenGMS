import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import type {
  PathData,
  PathPoint,
  Project,
  ProjectItem,
  ResourceType,
  RoomData,
  RoomInstance,
  RoomTile
} from '../../../shared/types'
import { assetUrl } from '../assets'

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>
type Camera = { x: number; y: number; zoom: number }
type Size = { width: number; height: number }
type Drag =
  | { kind: 'pan'; id: number; x: number; y: number; camera: Camera }
  | { kind: 'point'; id: number; index: number }
type ObjectVisual = {
  url?: string
  width: number
  height: number
  originX: number
  originY: number
  depth: number
}
type BackgroundVisual = { url?: string; width: number; height: number }

type PathCanvasProps = {
  path: PathData
  room: RoomData | null
  project: Project
  projectPath: string
  imageVersion: number
  selected: number
  showGrid: boolean
  onSelect: (index: number) => void
  onAdd: (x: number, y: number) => void
  onMove: (index: number, x: number, y: number) => void
  onDelete: (index: number) => void
}

function items(project: Project, type: ResourceType): ResourceItem[] {
  const result: ResourceItem[] = []
  function visit(list: ProjectItem[]): void {
    for (const item of list) {
      if (item.kind === 'group') visit(item.items)
      else if (item.type === type) result.push(item)
    }
  }
  for (const group of project.groups) visit(group.items)
  return result
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function snap(value: number, step: number): number {
  return Math.round(value / Math.max(1, step)) * Math.max(1, step)
}

function gmsColor(value: number): string {
  const color = value >>> 0
  return `rgb(${color & 0xff}, ${(color >>> 8) & 0xff}, ${(color >>> 16) & 0xff})`
}

function colorAlpha(value: number): number {
  return ((value >>> 24) & 0xff) / 255
}

function imageReady(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const size = 16
  ctx.fillStyle = '#aeb4bc'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#c8cdd3'
  for (let y = 0; y < height; y += size) {
    for (let x = (Math.floor(y / size) % 2) * size; x < width; x += size * 2) {
      ctx.fillRect(x, y, size, size)
    }
  }
}

function drawFallback(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  ctx.fillStyle = '#4c5665'
  ctx.fillRect(x, y, width, height)
  ctx.strokeStyle = '#aab4c2'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1))
  if (width >= 18 && height >= 14) {
    ctx.fillStyle = '#eef2f7'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.slice(0, 2).toUpperCase(), x + width / 2, y + height / 2)
  }
}

function tracePath(ctx: CanvasRenderingContext2D, path: PathData): void {
  const points = path.points
  if (points.length === 0) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  if (points.length === 1) return
  if (path.kind === 0) {
    for (let index = 1; index < points.length; index += 1) {
      ctx.lineTo(points[index].x, points[index].y)
    }
    if (path.closed) ctx.closePath()
    return
  }

  const count = points.length
  const segments = path.closed ? count : count - 1
  const steps = 2 ** clamp(path.precision, 1, 8)
  const point = (index: number): PathPoint => {
    if (path.closed) return points[(index + count) % count]
    return points[clamp(index, 0, count - 1)]
  }
  for (let segment = 0; segment < segments; segment += 1) {
    const p0 = point(segment - 1)
    const p1 = point(segment)
    const p2 = point(segment + 1)
    const p3 = point(segment + 2)
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      const t2 = t * t
      const t3 = t2 * t
      const x = 0.5 * (
        2 * p1.x + (-p0.x + p2.x) * t +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
      )
      const y = 0.5 * (
        2 * p1.y + (-p0.y + p2.y) * t +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
      )
      ctx.lineTo(x, y)
    }
  }
  if (path.closed) ctx.closePath()
}

export function PathCanvas({
  path,
  room,
  project,
  projectPath,
  imageVersion,
  selected,
  showGrid,
  onSelect,
  onAdd,
  onMove,
  onDelete
}: PathCanvasProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cameraRef = useRef<Camera>({ x: 80, y: 80, zoom: 1 })
  const dragRef = useRef<Drag | null>(null)
  const imagesRef = useRef(new Map<string, HTMLImageElement>())
  const mountedRef = useRef(true)
  const fittedRef = useRef('')
  const [camera, setCamera] = useState(cameraRef.current)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [imageTick, setImageTick] = useState(0)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(-1)
  const [panning, setPanning] = useState(false)
  cameraRef.current = camera

  const spriteItems = useMemo(() => items(project, 'sprite'), [project])
  const objectItems = useMemo(() => items(project, 'object'), [project])
  const backgroundItems = useMemo(() => items(project, 'background'), [project])
  const spriteMap = useMemo(() => new Map(spriteItems.map((item) => [item.name, item])), [spriteItems])
  const objects = useMemo(() => {
    const result = new Map<string, ObjectVisual>()
    for (const item of objectItems) {
      const sprite = item.object?.sprite ? spriteMap.get(item.object.sprite) : undefined
      result.set(item.name, {
        url: sprite?.image ? assetUrl(sprite.image, projectPath, imageVersion) : undefined,
        width: sprite?.sprite?.width || 24,
        height: sprite?.sprite?.height || 24,
        originX: sprite?.sprite?.xOrigin || 0,
        originY: sprite?.sprite?.yOrigin || 0,
        depth: item.object?.depth || 0
      })
    }
    return result
  }, [imageVersion, objectItems, projectPath, spriteMap])
  const backgrounds = useMemo(() => {
    const result = new Map<string, BackgroundVisual>()
    for (const item of backgroundItems) {
      result.set(item.name, {
        url: item.background?.image ? assetUrl(item.background.image, projectPath, imageVersion) : undefined,
        width: item.background?.width || 1,
        height: item.background?.height || 1
      })
    }
    return result
  }, [backgroundItems, imageVersion, projectPath])
  const urls = useMemo(() => {
    const result = new Set<string>()
    for (const value of objects.values()) if (value.url) result.add(value.url)
    for (const value of backgrounds.values()) if (value.url) result.add(value.url)
    return [...result]
  }, [backgrounds, objects])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => {
    for (const url of urls) {
      if (imagesRef.current.has(url)) continue
      const image = new Image()
      imagesRef.current.set(url, image)
      image.onload = () => { if (mountedRef.current) setImageTick((value) => value + 1) }
      image.onerror = () => { if (mountedRef.current) setImageTick((value) => value + 1) }
      image.src = url
    }
  }, [urls])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(1, Math.round(entry.contentRect.width)),
        height: Math.max(1, Math.round(entry.contentRect.height))
      })
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  function fit(): void {
    if (!size.width || !size.height) return
    let left = -160
    let top = -120
    let right = 160
    let bottom = 120
    if (room) {
      left = 0
      top = 0
      right = Math.max(1, room.width)
      bottom = Math.max(1, room.height)
    } else if (path.points.length > 0) {
      left = Math.min(...path.points.map((point) => point.x))
      top = Math.min(...path.points.map((point) => point.y))
      right = Math.max(...path.points.map((point) => point.x))
      bottom = Math.max(...path.points.map((point) => point.y))
      if (right - left < 64) { left -= 32; right += 32 }
      if (bottom - top < 64) { top -= 32; bottom += 32 }
    }
    const width = Math.max(1, right - left)
    const height = Math.max(1, bottom - top)
    const zoom = clamp(Math.min((size.width - 100) / width, (size.height - 100) / height), 0.05, 8)
    setCamera({
      x: size.width / 2 - (left + right) / 2 * zoom,
      y: size.height / 2 - (top + bottom) / 2 * zoom,
      zoom
    })
  }

  const fitKey = `${path.backgroundRoom}:${room?.width ?? 0}:${room?.height ?? 0}`
  useEffect(() => {
    if (!size.width || !size.height || fittedRef.current === fitKey) return
    fittedRef.current = fitKey
    fit()
  }, [fitKey, size.width, size.height])

  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !size.width || !size.height) return
    const ratio = Math.max(1, window.devicePixelRatio || 1)
    const pixelWidth = Math.round(size.width * ratio)
    const pixelHeight = Math.round(size.height * ratio)
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const context = ctx
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, size.width, size.height)
    ctx.fillStyle = '#171e27'
    ctx.fillRect(0, 0, size.width, size.height)
    ctx.save()
    ctx.translate(camera.x, camera.y)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.imageSmoothingEnabled = false

    if (room) {
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, room.width, room.height)
      ctx.clip()
      if (room.showColor) {
        ctx.fillStyle = gmsColor(room.color)
        ctx.fillRect(0, 0, room.width, room.height)
      } else drawChecker(ctx, room.width, room.height)

      function drawBackground(index: number): void {
        const layer = room?.backgrounds[index]
        if (!room || !layer?.visible || !layer.name) return
        const visual = backgrounds.get(layer.name)
        const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
        if (!visual || !imageReady(image)) return
        if (layer.stretch) {
          context.drawImage(image, 0, 0, room.width, room.height)
          return
        }
        const width = Math.max(1, visual.width)
        const height = Math.max(1, visual.height)
        const startX = layer.tileX ? ((layer.x % width) + width) % width - width : layer.x
        const startY = layer.tileY ? ((layer.y % height) + height) % height - height : layer.y
        const endX = layer.tileX ? room.width : startX + width
        const endY = layer.tileY ? room.height : startY + height
        let count = 0
        for (let y = startY; y < endY && count < 10000; y += height) {
          for (let x = startX; x < endX && count < 10000; x += width) {
            context.drawImage(image, x, y, width, height)
            count += 1
            if (!layer.tileX) break
          }
          if (!layer.tileY) break
        }
      }

      room.backgrounds.forEach((layer, index) => { if (!layer.foreground) drawBackground(index) })
      const renderables: Array<{
        depth: number
        order: number
        kind: 'tile' | 'instance'
        value: RoomTile | RoomInstance
      }> = []
      room.tiles.forEach((tile, order) => renderables.push({ depth: tile.depth, order, kind: 'tile', value: tile }))
      room.instances.forEach((instance, order) => renderables.push({
        depth: objects.get(instance.object)?.depth ?? 0,
        order: room.tiles.length + order,
        kind: 'instance',
        value: instance
      }))
      renderables.sort((left, right) => right.depth - left.depth || left.order - right.order)
      for (const entry of renderables) {
        if (entry.kind === 'tile') {
          const tile = entry.value as RoomTile
          const visual = backgrounds.get(tile.background)
          const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
          ctx.save()
          ctx.globalAlpha = colorAlpha(tile.color)
          ctx.translate(tile.x, tile.y)
          ctx.scale(tile.scaleX, tile.scaleY)
          if (imageReady(image) && tile.width > 0 && tile.height > 0) {
            try {
              ctx.drawImage(image, tile.sourceX, tile.sourceY, tile.width, tile.height, 0, 0, tile.width, tile.height)
            } catch {
              drawFallback(ctx, 'T', 0, 0, tile.width, tile.height)
            }
          } else drawFallback(ctx, 'T', 0, 0, Math.max(8, tile.width), Math.max(8, tile.height))
          ctx.restore()
          continue
        }
        const instance = entry.value as RoomInstance
        const visual = objects.get(instance.object)
        const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
        const width = visual?.width || 24
        const height = visual?.height || 24
        const originX = visual?.originX || 0
        const originY = visual?.originY || 0
        ctx.save()
        ctx.globalAlpha = colorAlpha(instance.color)
        ctx.translate(instance.x, instance.y)
        ctx.rotate(-instance.rotation * Math.PI / 180)
        ctx.scale(instance.scaleX, instance.scaleY)
        if (imageReady(image)) ctx.drawImage(image, -originX, -originY, width, height)
        else drawFallback(ctx, instance.object, -originX, -originY, width, height)
        ctx.restore()
      }
      room.backgrounds.forEach((layer, index) => { if (layer.foreground) drawBackground(index) })
      ctx.restore()
      ctx.strokeStyle = '#7c8999'
      ctx.lineWidth = 1 / camera.zoom
      ctx.strokeRect(0, 0, room.width, room.height)
    }

    if (showGrid) {
      const left = -camera.x / camera.zoom
      const top = -camera.y / camera.zoom
      const right = (size.width - camera.x) / camera.zoom
      const bottom = (size.height - camera.y) / camera.zoom
      let stepX = Math.max(1, path.snapX)
      let stepY = Math.max(1, path.snapY)
      while (stepX * camera.zoom < 9) stepX *= 2
      while (stepY * camera.zoom < 9) stepY *= 2
      ctx.beginPath()
      for (let x = Math.floor(left / stepX) * stepX; x <= right; x += stepX) {
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
      }
      for (let y = Math.floor(top / stepY) * stepY; y <= bottom; y += stepY) {
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
      }
      ctx.strokeStyle = 'rgba(102, 119, 139, 0.42)'
      ctx.lineWidth = 1 / camera.zoom
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, top)
      ctx.lineTo(0, bottom)
      ctx.moveTo(left, 0)
      ctx.lineTo(right, 0)
      ctx.strokeStyle = 'rgba(137, 158, 182, 0.72)'
      ctx.stroke()
    }

    if (path.points.length > 0) {
      tracePath(ctx, path)
      ctx.strokeStyle = 'rgba(4, 8, 13, 0.92)'
      ctx.lineWidth = 5 / camera.zoom
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()
      ctx.strokeStyle = '#f4cf46'
      ctx.lineWidth = 2 / camera.zoom
      ctx.stroke()
    }
    path.points.forEach((point, index) => {
      const radius = (index === selected ? 5 : 4) / camera.zoom
      ctx.beginPath()
      if (index === selected) {
        ctx.rect(point.x - radius, point.y - radius, radius * 2, radius * 2)
        ctx.fillStyle = '#5ac96b'
      } else {
        ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = index === hover ? '#81baff' : '#4f86e8'
      }
      ctx.fill()
      ctx.strokeStyle = '#07111d'
      ctx.lineWidth = 1.5 / camera.zoom
      ctx.stroke()
    })
    ctx.restore()
  }, [backgrounds, camera, hover, imageTick, objects, path, room, selected, showGrid, size])

  function world(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect()
    return {
      x: (clientX - (rect?.left ?? 0) - cameraRef.current.x) / cameraRef.current.zoom,
      y: (clientY - (rect?.top ?? 0) - cameraRef.current.y) / cameraRef.current.zoom
    }
  }

  function hit(point: { x: number; y: number }): number {
    const radius = 9 / cameraRef.current.zoom
    for (let index = path.points.length - 1; index >= 0; index -= 1) {
      const item = path.points[index]
      if (Math.hypot(item.x - point.x, item.y - point.y) <= radius) return index
    }
    return -1
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    const point = world(event.clientX, event.clientY)
    setCursor({ x: Math.round(point.x), y: Math.round(point.y) })
    if (event.button === 1) {
      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = {
        kind: 'pan',
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        camera: cameraRef.current
      }
      setPanning(true)
      return
    }
    const index = hit(point)
    if (event.button === 2) {
      event.preventDefault()
      if (index >= 0) onDelete(index)
      return
    }
    if (event.button !== 0) return
    if (index >= 0) {
      onSelect(index)
      event.currentTarget.setPointerCapture(event.pointerId)
      dragRef.current = { kind: 'point', id: event.pointerId, index }
      return
    }
    onAdd(event.altKey ? Math.round(point.x) : snap(point.x, path.snapX), event.altKey ? Math.round(point.y) : snap(point.y, path.snapY))
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    const point = world(event.clientX, event.clientY)
    setCursor({ x: Math.round(point.x), y: Math.round(point.y) })
    const drag = dragRef.current
    if (!drag) {
      setHover(hit(point))
      return
    }
    if (drag.id !== event.pointerId) return
    if (drag.kind === 'pan') {
      setCamera({
        ...drag.camera,
        x: drag.camera.x + event.clientX - drag.x,
        y: drag.camera.y + event.clientY - drag.y
      })
      return
    }
    const x = event.altKey ? Math.round(point.x) : snap(point.x, path.snapX)
    const y = event.altKey ? Math.round(point.y) : snap(point.y, path.snapY)
    onMove(drag.index, x, y)
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
    if (dragRef.current?.id !== event.pointerId) return
    dragRef.current = null
    setPanning(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function wheel(event: React.WheelEvent<HTMLCanvasElement>): void {
    event.preventDefault()
    const point = world(event.clientX, event.clientY)
    const zoom = clamp(cameraRef.current.zoom * Math.exp(-event.deltaY * 0.0015), 0.05, 16)
    const rect = event.currentTarget.getBoundingClientRect()
    setCamera({
      zoom,
      x: event.clientX - rect.left - point.x * zoom,
      y: event.clientY - rect.top - point.y * zoom
    })
  }

  function zoom(factor: number): void {
    const value = cameraRef.current
    const next = clamp(value.zoom * factor, 0.05, 16)
    setCamera({
      zoom: next,
      x: size.width / 2 - (size.width / 2 - value.x) / value.zoom * next,
      y: size.height / 2 - (size.height / 2 - value.y) / value.zoom * next
    })
  }

  const canvasCursor = panning ? 'grabbing' : dragRef.current?.kind === 'point' ? 'grabbing' : hover >= 0 ? 'grab' : 'default'
  return (
    <div ref={hostRef} className="path-canvas-wrap">
      <canvas
        ref={canvasRef}
        className="path-canvas"
        style={{ cursor: canvasCursor }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onPointerLeave={() => { if (!dragRef.current) setHover(-1) }}
        onWheel={wheel}
        onContextMenu={(event) => event.preventDefault()}
        onAuxClick={(event) => event.preventDefault()}
      />
      <div className="path-canvas-tools">
        <button onClick={() => zoom(0.8)} title="Zoom out"><Minus size={14} /></button>
        <button onClick={fit} title="Fit path"><Maximize2 size={14} /></button>
        <button onClick={() => zoom(1.25)} title="Zoom in"><Plus size={14} /></button>
      </div>
      <div className="path-canvas-status">
        <span>x: {cursor.x}</span>
        <span>y: {cursor.y}</span>
        <span>{Math.round(camera.zoom * 100)}%</span>
      </div>
    </div>
  )
}
