import { GUIDED_EXHALE_SECONDS } from './resetTiming'

// The exposed tips have open space behind them in the cove photograph.
const branches = [
  { left: .399, right: .532, top: .295, bottom: .386, anchor: .420, sky: .568, delay: .28, phase: .7 },
  { left: .462, right: .557, top: .393, bottom: .454, anchor: .486, sky: .583, delay: .66, phase: 2.4 },
]

const leaves = [
  { start: .82, duration: 2.72, x: .478, y: .351, travel: .217, fall: .048, size: .0105, turn: .8, color: '#b85727' },
  { start: 2.23, duration: 3.02, x: .495, y: .372, travel: .255, fall: .036, size: .0085, turn: 2.7, color: '#d18638' },
  { start: 3.54, duration: 2.46, x: .516, y: .415, travel: .190, fall: .045, size: .0077, turn: 4.1, color: '#8f502a' },
  { start: 5.31, duration: 2.12, x: .483, y: .341, travel: .210, fall: .038, size: .0097, turn: 1.9, color: '#bb6830' },
]

function ease(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function preparePlate(photo: HTMLImageElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const { width, height } = canvas.getBoundingClientRect()
  if (!width || !height) return null
  const scale = Math.min(1.5, window.devicePixelRatio || 1, 720 / width)
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
  const patches = branches.flatMap((branch) => {
    const x = Math.max(0, Math.floor(left + branch.left * photoWidth))
    const y = Math.max(0, Math.floor(top + branch.top * photoHeight))
    const right = Math.min(canvas.width, Math.ceil(left + branch.right * photoWidth))
    const bottom = Math.min(canvas.height, Math.ceil(top + branch.bottom * photoHeight))
    if (right <= x || bottom <= y) return []
    return [{ branch, x, y, layer: context.createImageData(right - x, bottom - y) }]
  })
  return { pixels, patches, left, top, photoWidth, photoHeight, width: canvas.width, height: canvas.height }
}

type WindPlate = NonNullable<ReturnType<typeof preparePlate>>

function drawBranches(context: CanvasRenderingContext2D, plate: WindPlate, time: number) {
  const { pixels, patches, left, top, photoWidth, photoHeight, width, height } = plate
  const settling = 1 - ease((time - 6.85) / 1.10)
  const lightness = (index: number) => (.23 * pixels[index] + .65 * pixels[index + 1] + .12 * pixels[index + 2])

  for (const { branch, x, y, layer } of patches) {
    const age = time - branch.delay
    const strength = ease(age / .7) * settling
    if (strength < .005) continue
    const swing = .54 + .36 * Math.sin(age * 2.7 + branch.phase) + .14 * Math.sin(age * 5.6)
    const lift = .30 * Math.sin(age * 2.7 + branch.phase + .85) + .16 * Math.sin(age * 5.6)
    const skyX = Math.max(0, Math.min(width - 1, Math.round(left + branch.sky * photoWidth)))
    layer.data.fill(0)

    for (let row = 0; row < layer.height; row++) {
      const py = y + row
      const imageY = (py - top) / photoHeight
      const coverY = ease((imageY - branch.top) / .012) * ease((branch.bottom - imageY) / .012)
      const skyIndex = (py * width + skyX) * 4
      const skyLight = lightness(skyIndex)

      for (let col = 0; col < layer.width; col++) {
        const px = x + col
        const imageX = (px - left) / photoWidth
        const reach = ease((imageX - branch.anchor) / .07) * coverY * ease((branch.right - imageX) / .012)
        if (reach < .01) continue
        const original = (py * width + px) * 4
        const sx = Math.max(0, Math.min(width - 1, px - .012 * photoWidth * strength * swing * reach))
        const sy = Math.max(0, Math.min(height - 1, py + .010 * photoHeight * strength * lift * reach))
        const x0 = Math.floor(sx)
        const y0 = Math.floor(sy)
        const a = (y0 * width + x0) * 4
        const b = (y0 * width + Math.min(width - 1, x0 + 1)) * 4
        const c = (Math.min(height - 1, y0 + 1) * width + x0) * 4
        const d = (Math.min(height - 1, y0 + 1) * width + Math.min(width - 1, x0 + 1)) * 4
        const mx = sx - x0
        const my = sy - y0
        const movedLight = (lightness(a) * (1 - mx) + lightness(b) * mx) * (1 - my) + (lightness(c) * (1 - mx) + lightness(d) * mx) * my
        const originalLeaf = ease((skyLight - lightness(original) - 18) / 43)
        const movedLeaf = ease((skyLight - movedLight - 18) / 43)
        const coverage = Math.max(originalLeaf, movedLeaf) * strength * Math.min(1, reach * 2)
        if (coverage < .01) continue
        const out = (row * layer.width + col) * 4
        for (let channel = 0; channel < 3; channel++) {
          const moved = (pixels[a + channel] * (1 - mx) + pixels[b + channel] * mx) * (1 - my) + (pixels[c + channel] * (1 - mx) + pixels[d + channel] * mx) * my
          // Only the small gap exposed by the moving silhouette receives sky.
          layer.data[out + channel] = moved + (pixels[skyIndex + channel] - moved) * (1 - movedLeaf) * originalLeaf * .84
        }
        layer.data[out + 3] = coverage * 255
      }
    }
    context.putImageData(layer, x, y)
  }
}

function drawLeaves(context: CanvasRenderingContext2D, plate: WindPlate, time: number) {
  const { left, top, photoWidth, photoHeight } = plate
  for (const leaf of leaves) {
    const age = time - leaf.start
    const progress = age / leaf.duration
    if (progress <= 0 || progress >= 1) continue
    const flutter = Math.sin(leaf.turn + age * 6.3)
    const x = left + photoWidth * (leaf.x + leaf.travel * progress)
    const y = top + photoHeight * (leaf.y + leaf.fall * progress ** 1.5 - .019 * Math.sin(progress * Math.PI) + .003 * flutter)
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

export function createCoveWind(photo: HTMLImageElement, canvas: HTMLCanvasElement) {
  const context = typeof CanvasRenderingContext2D === 'undefined' ? null : canvas.getContext('2d')
  let plate: WindPlate | null = null
  const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { plate = null })
  resize?.observe(canvas)
  return {
    draw(time = -1) {
      if (!context) return
      if (time < 0 || time >= GUIDED_EXHALE_SECONDS) {
        if (canvas.dataset.active) context.clearRect(0, 0, canvas.width, canvas.height)
        canvas.removeAttribute('data-active')
        return
      }
      if (!photo.naturalWidth) return
      plate ??= preparePlate(photo, canvas, context)
      if (!plate) return
      canvas.dataset.active = 'true'
      context.clearRect(0, 0, canvas.width, canvas.height)
      drawBranches(context, plate, time)
      drawLeaves(context, plate, time)
    },
    dispose() {
      resize?.disconnect()
      canvas.removeAttribute('data-active')
    },
  }
}
