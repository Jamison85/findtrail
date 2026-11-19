import { GUIDED_EXHALE_SECONDS } from './resetTiming'

// Crops follow individual crowns, with the weight falling to zero at the
// branch roots. Only exposed silhouettes need the sky behind them sampled.
const branches = [
  { left: .025, right: .274, top: .022, bottom: .105, anchor: .060, sky: .314, delay: .10, phase: .4, bend: .013 },
  { left: .152, right: .473, top: .106, bottom: .206, anchor: .186, sky: .492, delay: .24, phase: 1.1, bend: .017 },
  { left: .227, right: .472, top: .210, bottom: .292, anchor: .248, sky: .514, delay: .43, phase: 2.6, bend: .014 },
  { left: .043, right: .285, top: .286, bottom: .397, anchor: .071, sky: null, delay: .34, phase: 1.7, bend: .011 },
  { left: .399, right: .542, top: .296, bottom: .386, anchor: .414, sky: .576, delay: .59, phase: .7, bend: .014 },
  { left: .462, right: .563, top: .393, bottom: .454, anchor: .482, sky: .583, delay: .82, phase: 2.4, bend: .011 },
  { left: .701, right: .844, top: .422, bottom: .471, anchor: .710, sky: null, delay: 1.36, phase: 1.8, bend: .005 },
  { left: .851, right: 1, top: .391, bottom: .465, anchor: .857, sky: null, delay: 1.68, phase: 3.1, bend: .0045 },
]

const leaves = [
  { start: .26, duration: 3.0, x: .281, y: .138, travel: .541, fall: .112, size: .020, turn: .6, color: '#9d4a23' },
  { start: .48, duration: 3.8, x: .416, y: .172, travel: .449, fall: .066, size: .012, turn: 2.4, color: '#b87637' },
  { start: .82, duration: 2.72, x: .478, y: .351, travel: .217, fall: .048, size: .012, turn: .8, color: '#b85727' },
  { start: .98, duration: 3.6, x: .236, y: .356, travel: .564, fall: .215, size: .026, turn: 2.2, color: '#ae592a' },
  { start: 1.32, duration: 2.82, x: .448, y: .282, travel: .378, fall: .059, size: .011, turn: 4.1, color: '#916438' },
  { start: 1.62, duration: 2.73, x: .766, y: .439, travel: .264, fall: .015, size: .0065, turn: 2.8, color: '#a77946' },
  { start: 1.89, duration: 3.66, x: .347, y: .156, travel: .625, fall: .175, size: .022, turn: 3.1, color: '#bd712f' },
  { start: 2.23, duration: 3.02, x: .495, y: .372, travel: .255, fall: .036, size: .010, turn: 2.7, color: '#d18638' },
  { start: 2.57, duration: 2.75, x: .481, y: .320, travel: .378, fall: .092, size: .013, turn: 1.5, color: '#a45c2b' },
  { start: 2.92, duration: 3.68, x: .248, y: .373, travel: .793, fall: .158, size: .023, turn: .9, color: '#bc682b' },
  { start: 3.31, duration: 2.7, x: .895, y: .409, travel: .213, fall: .026, size: .007, turn: 3.4, color: '#b4834b' },
  { start: 3.54, duration: 2.46, x: .516, y: .415, travel: .190, fall: .045, size: .009, turn: 4.1, color: '#8f502a' },
  { start: 4.01, duration: 3.57, x: .399, y: .157, travel: .635, fall: .142, size: .016, turn: 4.9, color: '#a85926' },
  { start: 4.36, duration: 3.37, x: .191, y: .328, travel: .652, fall: .285, size: .025, turn: 3.3, color: '#8b4026' },
  { start: 4.78, duration: 2.75, x: .404, y: .254, travel: .445, fall: .101, size: .011, turn: 2.8, color: '#c08042' },
  { start: 5.31, duration: 2.12, x: .483, y: .341, travel: .210, fall: .038, size: .011, turn: 1.9, color: '#bb6830' },
  { start: 5.74, duration: 2.17, x: .302, y: .175, travel: .619, fall: .143, size: .019, turn: 1.4, color: '#bc702f' },
  { start: 6.12, duration: 1.80, x: .523, y: .418, travel: .316, fall: .061, size: .009, turn: 4.2, color: '#a76333' },
]

function ease(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function preparePlate(photo: HTMLImageElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return null
  const scale = Math.min(1.25, window.devicePixelRatio || 1, 720 / width)
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)
  const cover = Math.max(canvas.width / photo.naturalWidth, canvas.height / photo.naturalHeight)
  const photoWidth = photo.naturalWidth * cover
  const photoHeight = photo.naturalHeight * cover
  const left = (canvas.width - photoWidth) / 2
  const top = (canvas.height - photoHeight) / 2
  const reference = document.createElement('canvas')
  reference.width = canvas.width
  reference.height = canvas.height
  const plate = reference.getContext('2d', { willReadFrequently: true })
  if (!plate) return null
  plate.drawImage(photo, left, top, photoWidth, photoHeight)
  const pixels = plate.getImageData(0, 0, canvas.width, canvas.height).data
  const luma = new Uint8Array(pixels.length / 4)
  const foliage = new Uint8Array(luma.length)
  for (let i = 0; i < luma.length; i++) {
    const r = pixels[i * 4]
    const g = pixels[i * 4 + 1]
    const b = pixels[i * 4 + 2]
    luma[i] = .23 * r + .65 * g + .12 * b
    foliage[i] = 255 * ease((Math.max(r, g) - b - 7) / 31) * ease((luma[i] - 12) / 19) * (1 - ease((luma[i] - 141) / 51))
  }
  const patches = branches.flatMap((branch) => {
    const x = Math.max(0, Math.floor(left + branch.left * photoWidth))
    const y = Math.max(0, Math.floor(top + branch.top * photoHeight))
    const right = Math.min(canvas.width, Math.ceil(left + branch.right * photoWidth))
    const bottom = Math.min(canvas.height, Math.ceil(top + branch.bottom * photoHeight))
    if (right <= x || bottom <= y) return []
    const layer = context.createImageData(right - x, bottom - y)
    const reach = new Float32Array(layer.width * layer.height)
    for (let row = 0; row < layer.height; row++) {
      const photoY = (y + row - top) / photoHeight
      const towardTips = 1 - .56 * ease((photoY - branch.top) / (branch.bottom - branch.top))
      const featherY = ease((photoY - branch.top) / .012) * ease((branch.bottom - photoY) / .013)
      for (let col = 0; col < layer.width; col++) {
        const photoX = (x + col - left) / photoWidth
        reach[row * layer.width + col] = ease((photoX - branch.anchor) / .091) * towardTips * featherY * ease((branch.right - photoX) / .014)
      }
    }
    return [{ branch, x, y, layer, reach }]
  })
  return { pixels, luma, foliage, patches, left, top, photoWidth, photoHeight, width: canvas.width, height: canvas.height }
}

type WindPlate = NonNullable<ReturnType<typeof preparePlate>>

function drawBranches(context: CanvasRenderingContext2D, plate: WindPlate, time: number) {
  const { pixels, luma, foliage, patches, left, photoWidth, photoHeight, width, height } = plate
  const settling = 1 - ease((time - 6.85) / 1.10)

  for (const { branch, x, y, layer, reach } of patches) {
    const age = time - branch.delay
    const strength = ease(age / .7) * settling
    if (strength < .005) continue
    const gust = .78 + .22 * Math.sin(time * 1.95 - branch.delay)
    const swing = gust * (.67 + .33 * Math.sin(age * 2.65 + branch.phase))
    const lift = .25 * Math.sin(age * 2.65 + branch.phase + .8) + .14 * Math.sin(age * 5.2 + branch.phase)
    const skyX = branch.sky === null ? -1 : Math.max(0, Math.min(width - 1, Math.round(left + branch.sky * photoWidth)))
    const dx = branch.bend * photoWidth * strength * swing
    const dy = branch.bend * .8 * photoHeight * strength * lift
    layer.data.fill(0)

    for (let row = 0; row < layer.height; row++) {
      const py = y + row
      const skyIndex = py * width + skyX
      const skyLight = skyX >= 0 ? luma[skyIndex] : 0

      for (let col = 0; col < layer.width; col++) {
        const px = x + col
        const i = row * layer.width + col
        const bend = reach[i]
        if (bend < .01) continue
        const original = py * width + px
        if (skyX < 0 && foliage[original] < 4) continue
        const sx = Math.max(0, Math.min(width - 1, px - dx * bend))
        const sy = Math.max(0, Math.min(height - 1, py + dy * bend))
        const x0 = Math.floor(sx)
        const y0 = Math.floor(sy)
        const a = y0 * width + x0
        const b = y0 * width + Math.min(width - 1, x0 + 1)
        const c = Math.min(height - 1, y0 + 1) * width + x0
        const d = Math.min(height - 1, y0 + 1) * width + Math.min(width - 1, x0 + 1)
        const mx = sx - x0
        const my = sy - y0
        const movedLight = (luma[a] * (1 - mx) + luma[b] * mx) * (1 - my) + (luma[c] * (1 - mx) + luma[d] * mx) * my
        const originalLeaf = skyX >= 0 ? ease((skyLight - luma[original] - 14) / 39) : foliage[original] / 255
        const movedLeaf = skyX >= 0 ? ease((skyLight - movedLight - 14) / 39) : foliage[Math.round(sy) * width + Math.round(sx)] / 255
        const moving = skyX >= 0 ? Math.max(originalLeaf, movedLeaf) : Math.min(originalLeaf, movedLeaf)
        const coverage = moving * strength * Math.min(1, bend * 2.3)
        if (coverage < .01) continue
        const out = i * 4
        const fillSky = skyX >= 0 ? (1 - movedLeaf) * originalLeaf * .84 : 0
        for (let channel = 0; channel < 3; channel++) {
          const moved = (pixels[a * 4 + channel] * (1 - mx) + pixels[b * 4 + channel] * mx) * (1 - my) + (pixels[c * 4 + channel] * (1 - mx) + pixels[d * 4 + channel] * mx) * my
          // Only the small gap exposed by the moving silhouette receives sky.
          layer.data[out + channel] = fillSky > 0 ? moved + (pixels[skyIndex * 4 + channel] - moved) * fillSky : moved
        }
        layer.data[out + 3] = coverage * 255
      }
    }
    context.putImageData(layer, x, y)
  }
}

function drawLeaves(scene: CanvasRenderingContext2D, foreground: CanvasRenderingContext2D, plate: WindPlate, time: number) {
  const { left, top, photoWidth, photoHeight } = plate
  for (const leaf of leaves) {
    const age = time - leaf.start
    const progress = age / leaf.duration
    if (progress <= 0 || progress >= 1) continue
    const context = leaf.size >= .016 ? foreground : scene
    const flutter = Math.sin(leaf.turn + age * 6.3)
    const x = left + photoWidth * (leaf.x + leaf.travel * progress ** .89 + .012 * flutter * Math.sin(progress * Math.PI))
    const y = top + photoHeight * (leaf.y + leaf.fall * progress ** 1.45 - .023 * Math.sin(progress * Math.PI) + .005 * flutter)
    const size = leaf.size * photoWidth * (1 - .27 * progress)
    context.save()
    context.translate(x, y)
    context.rotate(leaf.turn + age * 2.5 + .65 * flutter)
    context.scale(size, size * (.29 + .50 * Math.abs(Math.cos(leaf.turn + age * 4.0))))
    context.globalAlpha = .86 * ease(progress / .12) * (1 - ease((progress - .80) / .20))
    context.fillStyle = leaf.color
    context.beginPath()
    context.moveTo(-.63, .12)
    context.bezierCurveTo(-.28, -.60, .18, -.49, .65, -.20)
    context.bezierCurveTo(.47, .33, -.04, .51, -.63, .12)
    context.fill()
    context.strokeStyle = '#f3bd72'
    context.lineWidth = .11
    context.beginPath()
    context.moveTo(-.48, .10)
    context.quadraticCurveTo(.06, .05, .52, -.18)
    context.stroke()
    context.restore()
  }
}

export function createCoveWind(photo: HTMLImageElement, canvas: HTMLCanvasElement, nearLeaves: HTMLCanvasElement) {
  const context = typeof CanvasRenderingContext2D === 'undefined' ? null : canvas.getContext('2d')
  const foreground = context ? nearLeaves.getContext('2d') : null
  let plate: WindPlate | null = null
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { plate = null })
  resize?.observe(canvas)
  return {
    draw(time = -1) {
      if (!context || !foreground) return
      if (time < 0 || time >= GUIDED_EXHALE_SECONDS) {
        if (canvas.dataset.active) {
          context.clearRect(0, 0, canvas.width, canvas.height)
          foreground.clearRect(0, 0, nearLeaves.width, nearLeaves.height)
        }
        canvas.removeAttribute('data-active')
        nearLeaves.removeAttribute('data-active')
        return
      }
      if (!photo.naturalWidth) return
      plate ??= preparePlate(photo, canvas, context)
      if (!plate) return
      canvas.dataset.active = 'true'
      nearLeaves.dataset.active = 'true'
      if (nearLeaves.width !== plate.width || nearLeaves.height !== plate.height) {
        nearLeaves.width = plate.width
        nearLeaves.height = plate.height
      }
      context.clearRect(0, 0, canvas.width, canvas.height)
      foreground.clearRect(0, 0, nearLeaves.width, nearLeaves.height)
      drawBranches(context, plate, time)
      drawLeaves(context, foreground, plate, time)
    },
    dispose() {
      resize?.disconnect()
      canvas.removeAttribute('data-active')
      nearLeaves.removeAttribute('data-active')
    },
  }
}
