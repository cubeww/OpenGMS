import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Maximize2, Minus, Plus } from 'lucide-react'
import type {
  Project,
  ProjectItem,
  ResourceType,
  RoomData,
  RoomInstance,
  RoomTile
} from '../../../shared/types'
import { assetUrl } from '../assets'

type ResourceItem = Extract<ProjectItem, { kind: 'resource' }>

export type RoomPage = 'settings' | 'tiles' | 'backgrounds' | 'views' | 'physics' | 'objects'

type Camera = { x: number; y: number; zoom: number }
type Size = { width: number; height: number }
type ObjectVisual = {
  url?: string
  width: number
  height: number
  originX: number
  originY: number
  depth: number
  boxLeft: number
  boxTop: number
  boxRight: number
  boxBottom: number
}
type BackgroundVisual = { url?: string; width: number; height: number }
type ObjectPlacement = {
  object: string
  scaleX: number
  scaleY: number
  rotation: number
  color: number
}
type TilePlacement = {
  background: string
  sourceX: number
  sourceY: number
  width: number
  height: number
}
type Hover = { rawX: number; rawY: number; x: number; y: number }

type RoomCanvasProps = {
  room: RoomData
  project: Project
  projectPath: string
  imageVersion: number
  page: RoomPage
  showGrid: boolean
  viewIndex: number
  selectedInstance: string
  tileDepth: number
  hideOtherLayers: boolean
  objectPlacement: ObjectPlacement
  tilePlacement: TilePlacement
  onSelectInstance: (name: string) => void
  onMoveInstance: (name: string, x: number, y: number) => void
  onFinishMoveInstance: (name: string, x: number, y: number) => void
  onResizeInstance: (name: string, x: number, y: number, scaleX: number, scaleY: number) => void
  onAddInstance: (x: number, y: number) => void
  onDeleteInstance: (name: string) => void
  onAddTile: (x: number, y: number) => void
  onDeleteTile: (id: number) => void
}

type Drag =
  | { kind: 'pan'; id: number; x: number; y: number; camera: Camera }
  | {
    kind: 'instance'
    id: number
    name: string
    pointerX: number
    pointerY: number
    instanceX: number
    instanceY: number
    currentX: number
    currentY: number
    moved: boolean
  }
  | {
    kind: 'resize'
    id: number
    name: string
    anchorX: number
    anchorY: number
    pointerX: number
    pointerY: number
    handleX: number
    handleY: number
    rotation: number
    oppositeX: number
    oppositeY: number
    width: number
    height: number
    cursor: ResizeCursor
  }

type ResizeCursor = 'ew-resize' | 'nwse-resize' | 'ns-resize' | 'nesw-resize'
type StretchHandle = {
  x: number
  y: number
  localX: number
  localY: number
  index: number
  cursor: ResizeCursor
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

function gmsColor(value: number, alpha = false): string {
  const color = value >>> 0
  const red = color & 0xff
  const green = (color >>> 8) & 0xff
  const blue = (color >>> 16) & 0xff
  const opacity = alpha ? (color >>> 24) / 255 : 1
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`
}

function colorAlpha(value: number): number {
  return ((value >>> 24) & 0xff) / 255
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function snap(value: number, step: number): number {
  return step > 0 ? Math.floor(value / step) * step : Math.floor(value)
}

function snapDelta(value: number, step: number): number {
  const size = step > 0 ? step : 1
  return Math.sign(value) * Math.floor(Math.abs(value) / size + 0.5) * size
}

function drawChecker(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const size = 18
  ctx.fillStyle = '#11161d'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#161d26'
  for (let y = 0; y < height; y += size) {
    for (let x = (Math.floor(y / size) % 2) * size; x < width; x += size * 2) {
      ctx.fillRect(x, y, size, size)
    }
  }
}

function drawRoomChecker(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  const size = 16
  ctx.fillStyle = '#b6bbc2'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#d3d6da'
  for (let y = 0; y < height; y += size) {
    for (let x = (Math.floor(y / size) % 2) * size; x < width; x += size * 2) {
      ctx.fillRect(x, y, size, size)
    }
  }
}

function imageReady(image: HTMLImageElement | undefined): image is HTMLImageElement {
  return Boolean(image?.complete && image.naturalWidth > 0 && image.naturalHeight > 0)
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
  ctx.strokeStyle = '#9da8b7'
  ctx.lineWidth = 1
  ctx.strokeRect(x + 0.5, y + 0.5, Math.max(0, width - 1), Math.max(0, height - 1))
  if (width >= 18 && height >= 14) {
    ctx.fillStyle = '#e0e5ec'
    ctx.font = '9px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(name.slice(0, 2).toUpperCase(), x + width / 2, y + height / 2)
  }
}

function stretchHandles(instance: RoomInstance, visual?: ObjectVisual): StretchHandle[] {
  const width = visual?.width || 24
  const height = visual?.height || 24
  const originX = visual?.originX ?? 0
  const originY = visual?.originY ?? 0
  const cosine = Math.cos(-instance.rotation * Math.PI / 180)
  const sine = Math.sin(-instance.rotation * Math.PI / 180)
  const handles = [
    { localX: -originX, localY: -originY },
    { localX: width - originX, localY: -originY },
    { localX: width - originX, localY: height - originY },
    { localX: -originX, localY: height - originY }
  ].map((handle) => {
    const x = handle.localX * instance.scaleX
    const y = handle.localY * instance.scaleY
    return {
      ...handle,
      x: instance.x + cosine * x - sine * y,
      y: instance.y + sine * x + cosine * y
    }
  })
  return handles.map((handle, index) => {
    const opposite = handles[(index + 2) % handles.length]
    const angle = (Math.atan2(handle.y - opposite.y, handle.x - opposite.x) * 180 / Math.PI + 180) % 180
    const cursor = (['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'] as const)[Math.round(angle / 45) % 4]
    return { ...handle, index, cursor }
  })
}

function hitStretchHandle(
  instance: RoomInstance,
  visual: ObjectVisual | undefined,
  x: number,
  y: number,
  zoom: number
): StretchHandle | undefined {
  const radius = 8 / zoom
  const handles = stretchHandles(instance, visual)
  for (let index = handles.length - 1; index >= 0; index -= 1) {
    const handle = handles[index]
    if (Math.hypot(handle.x - x, handle.y - y) <= radius) return handle
  }
  return undefined
}

function hitsInstance(instance: RoomInstance, visual: ObjectVisual | undefined, x: number, y: number): boolean {
  if (Math.abs(instance.scaleX) < 0.000001 || Math.abs(instance.scaleY) < 0.000001) return false
  const rotation = instance.rotation * Math.PI / 180
  const cosine = Math.cos(rotation)
  const sine = Math.sin(rotation)
  const dx = x - instance.x
  const dy = y - instance.y
  const imageX = (cosine * dx - sine * dy) / instance.scaleX + (visual?.originX ?? 0)
  const imageY = (sine * dx + cosine * dy) / instance.scaleY + (visual?.originY ?? 0)
  return imageX >= (visual?.boxLeft ?? 0) &&
    imageX < (visual?.boxRight ?? 24) &&
    imageY >= (visual?.boxTop ?? 0) &&
    imageY < (visual?.boxBottom ?? 24)
}

function hitInstance(room: RoomData, visuals: Map<string, ObjectVisual>, x: number, y: number): RoomInstance | undefined {
  const sorted = [...room.instances].sort((left, right) => {
    const leftDepth = visuals.get(left.object)?.depth ?? 0
    const rightDepth = visuals.get(right.object)?.depth ?? 0
    return leftDepth - rightDepth
  })
  for (const instance of sorted) {
    if (hitsInstance(instance, visuals.get(instance.object), x, y)) return instance
  }
  return undefined
}

function hitTile(room: RoomData, depth: number, x: number, y: number): RoomTile | undefined {
  for (let index = room.tiles.length - 1; index >= 0; index -= 1) {
    const tile = room.tiles[index]
    if (tile.depth !== depth) continue
    const width = tile.width * tile.scaleX
    const height = tile.height * tile.scaleY
    const left = Math.min(tile.x, tile.x + width)
    const right = Math.max(tile.x, tile.x + width)
    const top = Math.min(tile.y, tile.y + height)
    const bottom = Math.max(tile.y, tile.y + height)
    if (x >= left && x <= right && y >= top && y <= bottom) return tile
  }
  return undefined
}

export function RoomCanvas({
  room,
  project,
  projectPath,
  imageVersion,
  page,
  showGrid,
  viewIndex,
  selectedInstance,
  tileDepth,
  hideOtherLayers,
  objectPlacement,
  tilePlacement,
  onSelectInstance,
  onMoveInstance,
  onFinishMoveInstance,
  onResizeInstance,
  onAddInstance,
  onDeleteInstance,
  onAddTile,
  onDeleteTile
}: RoomCanvasProps): React.JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const canvasOverRef = useRef(false)
  const spaceHeldRef = useRef(false)
  const cameraRef = useRef<Camera>({ x: 40, y: 40, zoom: 1 })
  const fittedRef = useRef(false)
  const mountedRef = useRef(true)
  const imagesRef = useRef(new Map<string, HTMLImageElement>())
  const [camera, setCamera] = useState(cameraRef.current)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  const [imageTick, setImageTick] = useState(0)
  const [cursor, setCursor] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState<Hover | null>(null)
  const [panning, setPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [draggingInstance, setDraggingInstance] = useState(false)
  cameraRef.current = camera

  const spriteItems = useMemo(() => items(project, 'sprite'), [project])
  const objectItems = useMemo(() => items(project, 'object'), [project])
  const backgroundItems = useMemo(() => items(project, 'background'), [project])
  const spriteMap = useMemo(() => new Map(spriteItems.map((item) => [item.name, item])), [spriteItems])
  const objectVisuals = useMemo(() => {
    const result = new Map<string, ObjectVisual>()
    for (const item of objectItems) {
      const sprite = item.object?.sprite ? spriteMap.get(item.object.sprite) : undefined
      const data = sprite?.sprite
      const width = data?.width || 24
      const height = data?.height || 24
      const useFullBox = !data || data.width < 1 || data.height < 1 || data.boxMode === 'full'
      const rawLeft = useFullBox ? 0 : data.box.left
      const rawTop = useFullBox ? 0 : data.box.top
      const rawRight = useFullBox ? width : data.box.right + 1
      const rawBottom = useFullBox ? height : data.box.bottom + 1
      let boxLeft = clamp(rawLeft, 0, width)
      let boxTop = clamp(rawTop, 0, height)
      let boxRight = clamp(rawRight, boxLeft, width)
      let boxBottom = clamp(rawBottom, boxTop, height)
      if (boxRight <= boxLeft || boxBottom <= boxTop) {
        boxLeft = 0
        boxTop = 0
        boxRight = width
        boxBottom = height
      }
      result.set(item.name, {
        url: sprite?.image ? assetUrl(sprite.image, projectPath, imageVersion) : undefined,
        width,
        height,
        originX: data?.xOrigin ?? 0,
        originY: data?.yOrigin ?? 0,
        depth: item.object?.depth ?? 0,
        boxLeft,
        boxTop,
        boxRight,
        boxBottom
      })
    }
    return result
  }, [imageVersion, objectItems, projectPath, spriteMap])
  const backgroundVisuals = useMemo(() => {
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
    for (const value of objectVisuals.values()) if (value.url) result.add(value.url)
    for (const value of backgroundVisuals.values()) if (value.url) result.add(value.url)
    return [...result]
  }, [backgroundVisuals, objectVisuals])

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  useEffect(() => setHover(null), [page])

  useEffect(() => {
    const clearSpace = (): void => {
      spaceHeldRef.current = false
      setSpaceHeld(false)
    }
    const keyDown = (event: KeyboardEvent): void => {
      if (event.code !== 'Space' || event.repeat) return
      spaceHeldRef.current = true
      if (!canvasOverRef.current && document.activeElement !== canvasRef.current) return
      const target = event.target
      const editable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target instanceof HTMLButtonElement ||
        target instanceof HTMLAnchorElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      if (!editable) event.preventDefault()
      setSpaceHeld(true)
    }
    const keyUp = (event: KeyboardEvent): void => {
      if (event.code !== 'Space' || !spaceHeldRef.current) return
      clearSpace()
    }
    window.addEventListener('keydown', keyDown, true)
    window.addEventListener('keyup', keyUp, true)
    window.addEventListener('blur', clearSpace)
    return () => {
      spaceHeldRef.current = false
      window.removeEventListener('keydown', keyDown, true)
      window.removeEventListener('keyup', keyUp, true)
      window.removeEventListener('blur', clearSpace)
    }
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
      const width = Math.max(1, Math.round(entry.contentRect.width))
      const height = Math.max(1, Math.round(entry.contentRect.height))
      setSize({ width, height })
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  function fit(): void {
    if (!size.width || !size.height) return
    const zoom = clamp(Math.min((size.width - 80) / room.width, (size.height - 80) / room.height), 0.1, 4)
    setCamera({
      x: (size.width - room.width * zoom) / 2,
      y: (size.height - room.height * zoom) / 2,
      zoom
    })
  }

  useEffect(() => {
    if (!fittedRef.current && size.width && size.height) {
      fittedRef.current = true
      fit()
    }
  }, [size.width, size.height])

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
    drawChecker(ctx, size.width, size.height)
    ctx.save()
    ctx.translate(camera.x, camera.y)
    ctx.scale(camera.zoom, camera.zoom)
    ctx.imageSmoothingEnabled = false

    if (room.showColor) {
      ctx.fillStyle = gmsColor(room.color)
      ctx.fillRect(0, 0, room.width, room.height)
    } else {
      drawRoomChecker(ctx, room.width, room.height)
    }

    function drawBackground(index: number): void {
      const layer = room.backgrounds[index]
      if (!layer?.visible || !layer.name) return
      const visual = backgroundVisuals.get(layer.name)
      const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
      if (!visual || !imageReady(image)) return
      context.save()
      context.beginPath()
      context.rect(0, 0, room.width, room.height)
      context.clip()
      if (layer.stretch) {
        context.drawImage(image, 0, 0, room.width, room.height)
      } else {
        const width = Math.max(1, visual.width || image.naturalWidth)
        const height = Math.max(1, visual.height || image.naturalHeight)
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
      context.restore()
    }

    room.backgrounds.forEach((layer, index) => { if (!layer.foreground) drawBackground(index) })
    const renderables: Array<{ depth: number; order: number; kind: 'tile' | 'instance'; value: RoomTile | RoomInstance }> = []
    room.tiles.forEach((tile, order) => {
      if (!hideOtherLayers || page !== 'tiles' || tile.depth === tileDepth) {
        renderables.push({ depth: tile.depth, order, kind: 'tile', value: tile })
      }
    })
    room.instances.forEach((instance, order) => {
      renderables.push({
        depth: objectVisuals.get(instance.object)?.depth ?? 0,
        order: room.tiles.length + order,
        kind: 'instance',
        value: instance
      })
    })
    renderables.sort((left, right) => right.depth - left.depth || left.order - right.order)

    for (const entry of renderables) {
      if (entry.kind === 'tile') {
        const tile = entry.value as RoomTile
        const visual = backgroundVisuals.get(tile.background)
        const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
        ctx.save()
        ctx.globalAlpha = colorAlpha(tile.color)
        ctx.translate(tile.x, tile.y)
        ctx.scale(tile.scaleX, tile.scaleY)
        if (visual && imageReady(image) && tile.width > 0 && tile.height > 0) {
          try {
            ctx.drawImage(image, tile.sourceX, tile.sourceY, tile.width, tile.height, 0, 0, tile.width, tile.height)
          } catch {
            drawFallback(ctx, 'T', 0, 0, tile.width, tile.height)
          }
        } else {
          drawFallback(ctx, 'T', 0, 0, Math.max(8, tile.width), Math.max(8, tile.height))
        }
        ctx.restore()
        continue
      }

      const instance = entry.value as RoomInstance
      const visual = objectVisuals.get(instance.object)
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

    if (showGrid && room.snapX > 0 && room.snapY > 0 && camera.zoom * Math.min(room.snapX, room.snapY) >= 5) {
      const left = clamp(-camera.x / camera.zoom, 0, room.width)
      const top = clamp(-camera.y / camera.zoom, 0, room.height)
      const right = clamp((size.width - camera.x) / camera.zoom, 0, room.width)
      const bottom = clamp((size.height - camera.y) / camera.zoom, 0, room.height)
      ctx.beginPath()
      for (let x = Math.floor(left / room.snapX) * room.snapX; x <= right; x += room.snapX) {
        ctx.moveTo(x, top)
        ctx.lineTo(x, bottom)
      }
      for (let y = Math.floor(top / room.snapY) * room.snapY; y <= bottom; y += room.snapY) {
        ctx.moveTo(left, y)
        ctx.lineTo(right, y)
      }
      ctx.strokeStyle = 'rgba(55, 77, 104, 0.52)'
      ctx.lineWidth = 1 / camera.zoom
      ctx.stroke()
    }

    if (page === 'views') {
      room.views.forEach((view, index) => {
        if (!view.visible && index !== viewIndex) return
        ctx.strokeStyle = index === viewIndex ? '#55a8ff' : '#75ca8b'
        ctx.lineWidth = (index === viewIndex ? 2 : 1) / camera.zoom
        ctx.setLineDash(index === viewIndex ? [] : [6 / camera.zoom, 4 / camera.zoom])
        ctx.strokeRect(view.x, view.y, view.width, view.height)
      })
      ctx.setLineDash([])
    }

    const showPlacement = hover && !panning && !spaceHeld && !draggingInstance
    if (
      showPlacement &&
      page === 'objects' &&
      objectPlacement.object &&
      !hitInstance(room, objectVisuals, hover.rawX, hover.rawY)
    ) {
      const visual = objectVisuals.get(objectPlacement.object)
      const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
      const width = visual?.width || 24
      const height = visual?.height || 24
      const originX = visual?.originX || 0
      const originY = visual?.originY || 0
      const lineScale = Math.max(0.01, Math.min(Math.abs(objectPlacement.scaleX), Math.abs(objectPlacement.scaleY)))
      ctx.save()
      ctx.translate(hover.x, hover.y)
      ctx.rotate(-objectPlacement.rotation * Math.PI / 180)
      ctx.scale(objectPlacement.scaleX, objectPlacement.scaleY)
      ctx.globalAlpha = Math.max(0.14, colorAlpha(objectPlacement.color) * 0.5)
      if (imageReady(image)) ctx.drawImage(image, -originX, -originY, width, height)
      else drawFallback(ctx, objectPlacement.object, -originX, -originY, width, height)
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = '#80bdff'
      ctx.lineWidth = 1 / camera.zoom / lineScale
      ctx.setLineDash([4 / camera.zoom / lineScale, 3 / camera.zoom / lineScale])
      ctx.strokeRect(-originX, -originY, width, height)
      ctx.restore()
    } else if (showPlacement && page === 'tiles' && tilePlacement.background) {
      const visual = backgroundVisuals.get(tilePlacement.background)
      const image = visual?.url ? imagesRef.current.get(visual.url) : undefined
      ctx.save()
      ctx.translate(hover.x, hover.y)
      ctx.globalAlpha = 0.52
      if (visual && imageReady(image) && tilePlacement.width > 0 && tilePlacement.height > 0) {
        try {
          ctx.drawImage(
            image,
            tilePlacement.sourceX,
            tilePlacement.sourceY,
            tilePlacement.width,
            tilePlacement.height,
            0,
            0,
            tilePlacement.width,
            tilePlacement.height
          )
        } catch {
          drawFallback(ctx, 'T', 0, 0, tilePlacement.width, tilePlacement.height)
        }
      } else {
        drawFallback(ctx, 'T', 0, 0, Math.max(8, tilePlacement.width), Math.max(8, tilePlacement.height))
      }
      ctx.globalAlpha = 0.9
      ctx.strokeStyle = '#80bdff'
      ctx.lineWidth = 1 / camera.zoom
      ctx.setLineDash([4 / camera.zoom, 3 / camera.zoom])
      ctx.strokeRect(0, 0, tilePlacement.width, tilePlacement.height)
      ctx.restore()
    }

    if (selectedInstance) {
      const instance = room.instances.find((item) => item.name === selectedInstance)
      if (instance) {
        const handles = stretchHandles(instance, objectVisuals.get(instance.object))
        ctx.strokeStyle = '#62a8ff'
        ctx.lineWidth = 2 / camera.zoom
        ctx.beginPath()
        ctx.moveTo(handles[0].x, handles[0].y)
        for (let index = 1; index < handles.length; index += 1) ctx.lineTo(handles[index].x, handles[index].y)
        ctx.closePath()
        ctx.stroke()
        ctx.fillStyle = '#62a8ff'
        ctx.fillRect(instance.x - 2 / camera.zoom, instance.y - 2 / camera.zoom, 4 / camera.zoom, 4 / camera.zoom)
        const handleSize = 7 / camera.zoom
        ctx.lineWidth = 1 / camera.zoom
        for (const handle of handles) {
          ctx.fillStyle = '#e8f3ff'
          ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
          ctx.strokeStyle = '#357fc9'
          ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
        }
      }
    }

    ctx.strokeStyle = '#7d8da1'
    ctx.lineWidth = 1 / camera.zoom
    ctx.strokeRect(0, 0, room.width, room.height)
    ctx.restore()
  }, [
    backgroundVisuals,
    camera,
    hideOtherLayers,
    hover,
    imageTick,
    draggingInstance,
    objectPlacement.color,
    objectPlacement.object,
    objectPlacement.rotation,
    objectPlacement.scaleX,
    objectPlacement.scaleY,
    objectVisuals,
    page,
    panning,
    room,
    selectedInstance,
    showGrid,
    size,
    spaceHeld,
    tileDepth,
    tilePlacement.background,
    tilePlacement.height,
    tilePlacement.sourceX,
    tilePlacement.sourceY,
    tilePlacement.width,
    viewIndex
  ])

  function world(clientX: number, clientY: number): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect()
    const value = cameraRef.current
    return {
      x: (clientX - (rect?.left ?? 0) - value.x) / value.zoom,
      y: (clientY - (rect?.top ?? 0) - value.y) / value.zoom
    }
  }

  function place(point: { x: number; y: number }, free: boolean): { x: number; y: number } {
    return free
      ? { x: Math.round(point.x), y: Math.round(point.y) }
      : { x: snap(point.x, room.snapX), y: snap(point.y, room.snapY) }
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>): void {
    event.currentTarget.focus({ preventScroll: true })
    const point = world(event.clientX, event.clientY)
    const target = place(point, event.altKey)
    setCursor({ x: Math.round(point.x), y: Math.round(point.y) })
    setHover({ rawX: point.x, rawY: point.y, ...target })
    if (event.button === 1 || (event.button === 0 && spaceHeldRef.current)) {
      event.preventDefault()
      setSpaceHeld(true)
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
    if (event.button === 2) {
      event.preventDefault()
      if (page === 'objects') {
        const instance = hitInstance(room, objectVisuals, point.x, point.y)
        if (instance) onDeleteInstance(instance.name)
      } else if (page === 'tiles') {
        const tile = hitTile(room, tileDepth, point.x, point.y)
        if (tile) onDeleteTile(tile.id)
      }
      return
    }
    if (event.button !== 0) return

    if (page === 'objects') {
      const current = room.instances.find((item) => item.name === selectedInstance)
      const currentVisual = current ? objectVisuals.get(current.object) : undefined
      const handle = current
        ? hitStretchHandle(current, currentVisual, point.x, point.y, cameraRef.current.zoom)
        : undefined
      if (current && handle) {
        const handles = stretchHandles(current, currentVisual)
        const opposite = handles[(handle.index + 2) % handles.length]
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
          kind: 'resize',
          id: event.pointerId,
          name: current.name,
          anchorX: opposite.x,
          anchorY: opposite.y,
          pointerX: point.x,
          pointerY: point.y,
          handleX: handle.x,
          handleY: handle.y,
          rotation: current.rotation,
          oppositeX: opposite.localX,
          oppositeY: opposite.localY,
          width: handle.localX - opposite.localX,
          height: handle.localY - opposite.localY,
          cursor: handle.cursor
        }
        setDraggingInstance(true)
        return
      }
      const instance = hitInstance(room, objectVisuals, point.x, point.y)
      if (instance) {
        onSelectInstance(instance.name)
        event.currentTarget.setPointerCapture(event.pointerId)
        dragRef.current = {
          kind: 'instance',
          id: event.pointerId,
          name: instance.name,
          pointerX: point.x,
          pointerY: point.y,
          instanceX: instance.x,
          instanceY: instance.y,
          currentX: instance.x,
          currentY: instance.y,
          moved: false
        }
        setDraggingInstance(true)
      } else {
        onAddInstance(target.x, target.y)
      }
    } else if (page === 'tiles') {
      onAddTile(target.x, target.y)
    }
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>): void {
    const point = world(event.clientX, event.clientY)
    const target = place(point, event.altKey)
    setCursor({ x: Math.round(point.x), y: Math.round(point.y) })
    setHover({ rawX: point.x, rawY: point.y, ...target })
    const drag = dragRef.current
    if (!drag || drag.id !== event.pointerId) return
    if (drag.kind === 'pan') {
      setCamera({
        ...drag.camera,
        x: drag.camera.x + event.clientX - drag.x,
        y: drag.camera.y + event.clientY - drag.y
      })
      return
    }
    if (drag.kind === 'resize') {
      const deltaX = point.x - drag.pointerX
      const deltaY = point.y - drag.pointerY
      const handle = event.altKey
        ? {
          x: drag.handleX + Math.round(deltaX),
          y: drag.handleY + Math.round(deltaY)
        }
        : {
          x: drag.handleX + snapDelta(deltaX, room.snapX),
          y: drag.handleY + snapDelta(deltaY, room.snapY)
        }
      setHover({ rawX: point.x, rawY: point.y, ...handle })
      const rotation = drag.rotation * Math.PI / 180
      const cosine = Math.cos(rotation)
      const sine = Math.sin(rotation)
      const dx = handle.x - drag.anchorX
      const dy = handle.y - drag.anchorY
      const localX = cosine * dx - sine * dy
      const localY = sine * dx + cosine * dy
      const scaleX = localX / drag.width
      const scaleY = localY / drag.height
      const drawCosine = Math.cos(-rotation)
      const drawSine = Math.sin(-rotation)
      const oppositeX = drag.oppositeX * scaleX
      const oppositeY = drag.oppositeY * scaleY
      const x = drag.anchorX - (drawCosine * oppositeX - drawSine * oppositeY)
      const y = drag.anchorY - (drawSine * oppositeX + drawCosine * oppositeY)
      onResizeInstance(
        drag.name,
        Math.round(x),
        Math.round(y),
        Math.round(scaleX * 10000) / 10000,
        Math.round(scaleY * 10000) / 10000
      )
      return
    }
    const dx = point.x - drag.pointerX
    const dy = point.y - drag.pointerY
    const next = event.altKey
      ? { x: drag.instanceX + Math.round(dx), y: drag.instanceY + Math.round(dy) }
      : {
        x: drag.instanceX + snapDelta(dx, room.snapX),
        y: drag.instanceY + snapDelta(dy, room.snapY)
      }
    setHover({ rawX: point.x, rawY: point.y, ...next })
    if (drag.currentX !== next.x || drag.currentY !== next.y) {
      drag.currentX = next.x
      drag.currentY = next.y
      drag.moved = true
      onMoveInstance(drag.name, next.x, next.y)
    }
  }

  function pointerUp(event: React.PointerEvent<HTMLCanvasElement>): void {
    const drag = dragRef.current
    if (drag?.id !== event.pointerId) return
    if (drag.kind === 'instance' && drag.moved) {
      onFinishMoveInstance(drag.name, drag.currentX, drag.currentY)
    }
    dragRef.current = null
    setPanning(false)
    setSpaceHeld(spaceHeldRef.current && canvasOverRef.current)
    setDraggingInstance(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function wheel(event: React.WheelEvent<HTMLCanvasElement>): void {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const current = cameraRef.current
    const screenX = event.clientX - rect.left
    const screenY = event.clientY - rect.top
    const roomX = (screenX - current.x) / current.zoom
    const roomY = (screenY - current.y) / current.zoom
    const zoom = clamp(current.zoom * Math.exp(-event.deltaY * 0.0012), 0.1, 8)
    setCamera({ x: screenX - roomX * zoom, y: screenY - roomY * zoom, zoom })
  }

  function zoom(factor: number): void {
    const current = cameraRef.current
    const x = size.width / 2
    const y = size.height / 2
    const roomX = (x - current.x) / current.zoom
    const roomY = (y - current.y) / current.zoom
    const next = clamp(current.zoom * factor, 0.1, 8)
    setCamera({ x: x - roomX * next, y: y - roomY * next, zoom: next })
  }

  const selectedForCursor = page === 'objects'
    ? room.instances.find((item) => item.name === selectedInstance)
    : undefined
  const hoverHandle = selectedForCursor && hover
    ? hitStretchHandle(
      selectedForCursor,
      objectVisuals.get(selectedForCursor.object),
      hover.rawX,
      hover.rawY,
      camera.zoom
    )
    : undefined
  const activeDrag = dragRef.current
  const canvasCursor = panning
    ? 'grabbing'
    : spaceHeld
      ? 'grab'
      : activeDrag?.kind === 'resize'
        ? activeDrag.cursor
        : hoverHandle?.cursor ?? 'default'

  return (
    <div ref={hostRef} className={`room-canvas-wrap ${panning ? 'panning' : ''}`}>
      <canvas
        ref={canvasRef}
        className="room-canvas"
        style={{ cursor: canvasCursor }}
        tabIndex={0}
        onPointerDown={pointerDown}
        onPointerEnter={() => {
          canvasOverRef.current = true
          if (spaceHeldRef.current) setSpaceHeld(true)
        }}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onPointerLeave={() => {
          canvasOverRef.current = false
          if (!dragRef.current) {
            setHover(null)
            setSpaceHeld(false)
          }
        }}
        onWheel={wheel}
        onContextMenu={(event) => event.preventDefault()}
        onAuxClick={(event) => event.preventDefault()}
      />
      <div className="room-canvas-tools">
        <button onClick={() => zoom(0.8)} title="Zoom out"><Minus size={14} /></button>
        <button className="room-zoom-label" onClick={() => setCamera((value) => ({ ...value, zoom: 1 }))} title="Reset zoom">
          {Math.round(camera.zoom * 100)}%
        </button>
        <button onClick={() => zoom(1.25)} title="Zoom in"><Plus size={14} /></button>
        <button onClick={fit} title="Fit room"><Maximize2 size={14} /></button>
      </div>
      <footer className="room-canvas-status">
        <span>X {cursor.x}</span><span>Y {cursor.y}</span>
        {hover && (page === 'objects' || page === 'tiles') && (
          <><span>Aligned X {hover.x}</span><span>Aligned Y {hover.y}</span></>
        )}
        <span>{room.instances.length} instances</span><span>{room.tiles.length} tiles</span>
        {selectedInstance && <strong>{selectedInstance}</strong>}
      </footer>
    </div>
  )
}
