import { GUIDED_EXHALE_SECONDS, RIPPLE_DRAG, RIPPLE_DRAG_FALLOFF, RIPPLE_RATE, RIPPLE_SPEED, RIPPLE_TAIL_SECONDS } from './resetTiming'

export type LakeMotion = 'inhale' | 'hold' | 'exhale' | 'tail'

// Photo coordinates for this cove, before the image is cropped to the screen.
export const COVE_SHORELINE = { distant: .4843, left: .4956, leftSlope: .0029, leftStart: .541, leftEnd: .563, vanishing: .441, outlet: .605 }
const FOG_SETTLED_HEIGHT = .64
const FOG_SWOLLEN_HEIGHT = 1.12
const FOG_MAX_LIFT = .66
const HELD_FOG = 1.70
const FULL_FOG = 1.88
const READY_FOG = .88

export function lakeFog(motion: LakeMotion, progress: number, entry = 1) {
  if (motion === 'tail') return { distance: 0, amount: READY_FOG * (1 - smooth(progress)), height: FOG_SETTLED_HEIGHT, lift: 0, sway: 0 }
  if (motion === 'hold') return { distance: 1, amount: HELD_FOG, height: FOG_SWOLLEN_HEIGHT, lift: FOG_MAX_LIFT, sway: 0 }
  const gust = (4 * progress * (1 - progress)) ** 2
  const swell = smooth(motion === 'inhale' ? progress : 1 - progress)
  const height = FOG_SETTLED_HEIGHT + (FOG_SWOLLEN_HEIGHT - FOG_SETTLED_HEIGHT) * swell
  const lift = FOG_MAX_LIFT * swell
  if (motion === 'inhale') {
    const gathered = READY_FOG + (FULL_FOG - READY_FOG) * smooth(progress / .40)
    return {
      distance: progress,
      amount: smooth(entry) * (gathered - (gathered - HELD_FOG) * smooth((progress - .66) / .34)),
      height,
      lift,
      sway: gust,
    }
  }
  return {
    distance: 1 - progress,
    amount: HELD_FOG + (READY_FOG - HELD_FOG) * smooth(progress),
    height,
    lift,
    sway: gust > 0 ? -gust : 0,
  }
}

export function createBreathingLake(photo: HTMLImageElement, canvas: HTMLCanvasElement) {
  const context = typeof CanvasRenderingContext2D === 'undefined'
    ? null
    : canvas.getContext('2d', { willReadFrequently: true })
  let lake: ReturnType<typeof sampleLake> | undefined
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { lake = undefined })
  observer?.observe(photo)
  observer?.observe(canvas)

  return {
    draw(motion: LakeMotion | null, progress = 0, waveTime = -1, seconds = 0) {
      if (!motion) {
        canvas.removeAttribute('data-motion-phase')
        return
      }
      const samePhase = canvas.dataset.motionPhase === motion
      if (!samePhase) canvas.dataset.motionPhase = motion
      if (!context || !photo.naturalWidth) return
      lake ??= sampleLake(photo, canvas, context)
      if (!lake) return
      lake.overlay.data.fill(0)
      if (waveTime >= 0) paintWaves(lake, waveTime)
      const fog = lakeFog(motion, progress, seconds / 1.2)
      if (fog.amount > .001) paintMist(lake, fog, seconds)
      context.putImageData(lake.overlay, 0, 0)
    },
    dispose() {
      observer?.disconnect()
      canvas.removeAttribute('data-motion-phase')
    },
  }
}

function sampleLake(photo: HTMLImageElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const frame = canvas.getBoundingClientRect()
  const image = photo.getBoundingClientRect()
  if (!frame.width || !frame.height) return
  const resolution = Math.min(1, 500 / frame.width)
  const width = Math.round(frame.width * resolution)
  const height = Math.round(frame.height * resolution)
  canvas.width = width
  canvas.height = height

  // Match the portrait's centered cover crop so waves can bend the reflection itself.
  const cover = Math.max(image.width / photo.naturalWidth, image.height / photo.naturalHeight)
  const imageWidth = photo.naturalWidth * cover
  const imageHeight = photo.naturalHeight * cover
  const left = image.left + (image.width - imageWidth) / 2 - frame.left
  const top = image.top + (image.height - imageHeight) / 2 - frame.top
  context.drawImage(photo, left * resolution, top * resolution, imageWidth * resolution, imageHeight * resolution)
  return {
    width, height,
    cropLeft: -left / imageWidth,
    cropTop: -top / imageHeight,
    cropWidth: frame.width / imageWidth,
    cropHeight: frame.height / imageHeight,
    source: context.getImageData(0, 0, width, height).data,
    overlay: context.createImageData(width, height),
  }
}

type LakeSurface = NonNullable<ReturnType<typeof sampleLake>>

function smooth(progress: number) {
  const value = Math.max(0, Math.min(progress, 1))
  return value * value * (3 - 2 * value)
}

function noiseGrid(width: number, height: number, seed: number) {
  return Float32Array.from({ length: width * height }, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  })
}

const MIST_SIZE = 128
const MIST_LAYERS = [
  { width: 7, height: 13, weight: .57, seed: 389 },
  { width: 12, height: 28, weight: .29, seed: 771 },
  { width: 25, height: 48, weight: .14, seed: 581 },
]
const mistTexture = new Float32Array(MIST_SIZE ** 2)

for (const { width, height, weight, seed } of MIST_LAYERS) {
  const grid = noiseGrid(width, height, seed)
  for (let y = 0; y < MIST_SIZE; y++) {
    const row = y * height / MIST_SIZE
    const top = Math.floor(row)
    const bottom = (top + 1) % height
    const blendY = smooth(row - top)
    for (let x = 0; x < MIST_SIZE; x++) {
      const column = x * width / MIST_SIZE
      const left = Math.floor(column)
      const right = (left + 1) % width
      const blendX = smooth(column - left)
      const a = grid[top * width + left] * (1 - blendX) + grid[top * width + right] * blendX
      const b = grid[bottom * width + left] * (1 - blendX) + grid[bottom * width + right] * blendX
      mistTexture[y * MIST_SIZE + x] += (a * (1 - blendY) + b * blendY) * weight
    }
  }
}

function mistAt(x: number, y: number) {
  const textureX = (x - Math.floor(x)) * MIST_SIZE
  const textureY = (y - Math.floor(y)) * MIST_SIZE
  const col = Math.floor(textureX)
  const row = Math.floor(textureY)
  const nextCol = (col + 1) % MIST_SIZE
  const nextRow = (row + 1) % MIST_SIZE
  const u = textureX - col
  const v = textureY - row
  const near = mistTexture[row * MIST_SIZE + col] * (1 - u) + mistTexture[row * MIST_SIZE + nextCol] * u
  const far = mistTexture[nextRow * MIST_SIZE + col] * (1 - u) + mistTexture[nextRow * MIST_SIZE + nextCol] * u
  return near * (1 - v) + far * v
}

function paintMist({ width, height, cropLeft, cropTop, cropWidth, cropHeight, source, overlay }: LakeSurface, fog: ReturnType<typeof lakeFog>, seconds: number) {
  const drift = smooth(fog.distance)
  const distant = (COVE_SHORELINE.distant - cropTop) / cropHeight
  const outlet = (COVE_SHORELINE.outlet - cropLeft) / cropWidth
  const center = distant + .10 + drift * .12 - fog.lift * .08
  const depth = .25 * fog.height
  const spread = .61 + drift * .21
  const driftX = fog.sway * .035
  const bankLift = Float32Array.from({ length: width }, (_, x) =>
    (mistAt(x / width * .57 + .26 - seconds * .004, .55 + seconds * .002) - .5) * 1.12)
  const start = Math.max(0, Math.floor(Math.min(distant - .13, center - depth * 1.55) * height))
  const end = Math.min(height, Math.ceil(Math.max(distant + .13, center + depth * 1.55) * height))
  for (let y = start; y < end; y++) {
    const level = y / height
    const edgeY = smooth(level / .11) * smooth((1 - level) / .18)
    const farBody = (1 - smooth(Math.abs(level - distant) / .13)) * (.72 - drift * .37)
    for (let x = 0; x < width; x++) {
      const across = x / width
      const distance = (level - center) / depth + bankLift[x]
      const nearBody = Math.max(0, 1 - distance * distance) ** 2
      if (nearBody === 0 && farBody === 0) continue
      const flowX = (across - outlet - driftX) / spread
      const flowY = distance * .22 + drift * .17
      const bank = mistAt(flowX - seconds * .007, flowY + seconds * .004)
      const turn = 5 * flowX + 4 * flowY + seconds * .38
      const wisp = mistAt(flowX * 1.72 + Math.sin(turn) * .071 + bank * .14, flowY * 1.60 + Math.cos(turn) * .065 + .35)
      const cloud = smooth((bank * .52 + wisp * .48 - .32) / .46)
      const gathering = smooth((drift - .18 + (bank - .5) * .29) / .80)
      const distantMist = farBody * mistAt(across * 1.14 - seconds * .004, level * 1.81 + .36)
      const body = (nearBody * cloud * gathering + distantMist) * fog.amount * edgeY
      const shifted = across - driftX * .7
      const edges = smooth(Math.min(shifted, 1 - shifted) / .23) * (1 - .72 * (1 - smooth(across / .54)) * (1 - smooth((level - .20) / .17)))
      const pixel = (y * width + x) * 4
      const mist = 255 * (1 - Math.exp(-1.15 * body * edges))
      const water = overlay.data[pixel + 3] * (1 - mist / 255)
      const total = mist + water
      if (total === 0) continue
      overlay.data[pixel] = ((173 + source[pixel] * .18) * mist + overlay.data[pixel] * water) / total
      overlay.data[pixel + 1] = ((162 + source[pixel + 1] * .18) * mist + overlay.data[pixel + 1] * water) / total
      overlay.data[pixel + 2] = ((150 + source[pixel + 2] * .18) * mist + overlay.data[pixel + 2] * water) / total
      overlay.data[pixel + 3] = total
    }
  }
}

function paintWaves({ width, height, source, overlay, cropLeft, cropTop, cropWidth, cropHeight }: LakeSurface, seconds: number) {
  const settling = 1 - smooth((seconds - GUIDED_EXHALE_SECONDS) / RIPPLE_TAIL_SECONDS)
  const { distant, left, leftSlope, leftStart, leftEnd, vanishing } = COVE_SHORELINE

  for (let y = 0; y < height; y++) {
    const photoY = cropTop + y / height * cropHeight
    if (photoY <= distant) continue
    const distanceForward = .9594 / (photoY - vanishing) - 3.14
    if (distanceForward <= 0) continue
    const taper = settling * smooth(distanceForward / .60)
    for (let x = 0; x < width; x++) {
      const across = x / width - .5
      const photoX = cropLeft + x / width * cropWidth
      const nearBank = left - leftSlope * smooth((photoX - .10) / .43)
      const waterline = nearBank + (distant - nearBank) * smooth((photoX - leftStart) / (leftEnd - leftStart))
      const waterEdge = smooth((photoY - waterline) / .004)
      if (waterEdge === 0) continue
      const distance = Math.hypot(distanceForward, across * (3.0 + .23 * distanceForward))
      const travel = distance / RIPPLE_SPEED + RIPPLE_DRAG * distance ** 2 / (1 + RIPPLE_DRAG_FALLOFF * distance)
      const emitted = seconds - travel
      const angle = distanceForward / distance
      const spread = .70 - .96 * smooth((distance - .20) / 6.7)
      const envelope = smooth(emitted / .40) * (1 - smooth((emitted - GUIDED_EXHALE_SECONDS) / .18))
        * (1 - .77 * smooth((distance - 1.15) / 23.85)) * smooth((angle - spread) / .29)
      if (envelope < .008) continue
      const slope = Math.sin(emitted * RIPPLE_RATE + across * 1.6)
      const texture = Math.sin(emitted * RIPPLE_RATE * 1.82 - across * 6.0) * .24
      const shallows = .27 + .73 * smooth((photoY - waterline - .0018) / .0552)
      const push = (slope + texture) * taper * envelope * 1.17 * shallows
      const reflectedY = Math.min(height - 1, Math.max(0, (waterline - cropTop) / cropHeight * height, y + push * 6))
      const near = Math.floor(reflectedY)
      const mix = reflectedY - near
      const a = (near * width + x) * 4
      const b = (Math.min(height - 1, near + 1) * width + x) * 4
      const edgeFade = smooth(Math.min(x, width - x) / 16)
      const light = push * (14 + source[a] * .052)
      const pixel = (y * width + x) * 4
      overlay.data[pixel] = source[a] * (1 - mix) + source[b] * mix + light
      overlay.data[pixel + 1] = source[a + 1] * (1 - mix) + source[b + 1] * mix + light * .83
      overlay.data[pixel + 2] = source[a + 2] * (1 - mix) + source[b + 2] * mix + light * .61
      overlay.data[pixel + 3] = 255 * edgeFade * waterEdge * Math.min(1, envelope * 3) * smooth(taper / .09)
    }
  }
}
