import { GUIDED_EXHALE_SECONDS, RIPPLE_DRAG, RIPPLE_DRAG_FALLOFF, RIPPLE_RATE, RIPPLE_SPEED, RIPPLE_TAIL_SECONDS } from './resetTiming'

export type LakeMotion = 'inhale' | 'hold' | 'exhale' | 'tail'

// Photo coordinates for this cove, before the image is cropped to the screen.
export const COVE_SHORELINE = { distant: .4843, left: .4956, leftSlope: .0029, leftStart: .541, leftEnd: .563, vanishing: .441 }
// Small foliage clusters in uncropped photo coordinates. The outer needles and
// leaves move first, with a much weaker response on the opposite bank.
export const COVE_FOLIAGE = [
  { x: .166, y: .342, width: .085, height: .046, delay: .26, strength: .0070, phase: .7 },
  { x: .452, y: .342, width: .062, height: .038, delay: .40, strength: .0092, phase: 2.2 },
  { x: .517, y: .421, width: .040, height: .031, delay: .61, strength: .0074, phase: 3.9 },
  { x: .896, y: .425, width: .104, height: .034, delay: 1.66, strength: .0039, phase: 1.6 },
] as const
const FOG_SETTLED_HEIGHT = .64
const FOG_SWOLLEN_HEIGHT = 1.12
const FOG_MAX_LIFT = .66
const HELD_FOG = .18
const FULL_FOG = 2.05
const RELEASED_FOG = 1.42
const READY_FOG = .82

export function lakeFog(motion: LakeMotion, progress: number, entry = 1) {
  if (motion === 'tail') return { distance: 0, amount: READY_FOG * (1 - smooth(progress)), height: FOG_SETTLED_HEIGHT, lift: 0, sway: 0 }
  if (motion === 'hold') return { distance: 1, amount: HELD_FOG, height: FOG_SWOLLEN_HEIGHT, lift: FOG_MAX_LIFT, sway: 0 }
  const gust = 4 * progress * (1 - progress)
  const swell = smooth(motion === 'inhale' ? progress : 1 - progress)
  const height = FOG_SETTLED_HEIGHT + (FOG_SWOLLEN_HEIGHT - FOG_SETTLED_HEIGHT) * swell
  const lift = FOG_MAX_LIFT * swell
  if (motion === 'inhale') {
    const gathered = READY_FOG + (FULL_FOG - READY_FOG) * smooth(progress / .40)
    return {
      distance: progress,
      amount: smooth(entry) * (gathered - (gathered - HELD_FOG) * smooth((progress - .71) / .29)),
      height,
      lift,
      sway: gust,
    }
  }
  const released = HELD_FOG + (RELEASED_FOG - HELD_FOG) * smooth(progress / .23)
  return {
    distance: 1 - progress,
    amount: released + (READY_FOG - released) * smooth((progress - .52) / .48),
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
    draw(motion: LakeMotion | null, progress = 0, waveTime = -1, entry = 1) {
      if (!motion) {
        canvas.removeAttribute('data-motion-phase')
        return
      }
      const samePhase = canvas.dataset.motionPhase === motion
      if (!samePhase) canvas.dataset.motionPhase = motion
      if (!context || !photo.naturalWidth) return
      if (motion === 'hold' && samePhase && lake) return
      lake ??= sampleLake(photo, canvas, context)
      if (!lake) return
      lake.overlay.data.fill(0)
      if (waveTime >= 0 && waveTime < GUIDED_EXHALE_SECONDS) paintFoliage(lake, waveTime)
      if (waveTime >= 0) paintWaves(lake, waveTime)
      const fog = lakeFog(motion, progress, entry)
      if (fog.amount > .001) paintMist(lake, fog)
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

function paintMist({ width, height, source, overlay }: LakeSurface, fog: ReturnType<typeof lakeFog>) {
  const drift = smooth(fog.distance)
  const center = .27 + drift * .25 - fog.lift * .16
  const depth = (.12 + drift * .22) * fog.height
  const spread = .48 + drift * .36
  for (let y = 0; y < height; y++) {
    const level = y / height
    const distance = (level - center) / depth
    if (Math.abs(distance) >= 1) continue
    const body = (1 - distance * distance) ** 2 * fog.amount * smooth(level / .11) * smooth((1 - level) / .18)
    const textureY = ((1.3 + distance * .23 + drift * .37) * MIST_SIZE) % MIST_SIZE
    const row = Math.floor(textureY)
    const nextRow = (row + 1) % MIST_SIZE
    const blendY = textureY - row
    const driftX = fog.sway * (.13 + .04 * Math.sin(distance * 3))
    for (let x = 0; x < width; x++) {
      const across = x / width
      const textureX = ((1 + (across - driftX) / spread + .035 * drift) * MIST_SIZE) % MIST_SIZE
      const column = Math.floor(textureX)
      const nextColumn = (column + 1) % MIST_SIZE
      const blendX = textureX - column
      const near = mistTexture[row * MIST_SIZE + column] * (1 - blendX) + mistTexture[row * MIST_SIZE + nextColumn] * blendX
      const far = mistTexture[nextRow * MIST_SIZE + column] * (1 - blendX) + mistTexture[nextRow * MIST_SIZE + nextColumn] * blendX
      const texture = near * (1 - blendY) + far * blendY
      const cloud = Math.max(0, (texture - .19) / .81) ** 1.7
      const shifted = across - driftX * .7
      const edges = smooth(Math.min(shifted, 1 - shifted) / .23) * (1 - .72 * (1 - smooth(across / .54)) * (1 - smooth((level - .20) / .17)))
      const pixel = (y * width + x) * 4
      const mist = 255 * (1 - Math.exp(-1.15 * body * cloud * edges))
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

function paintFoliage({ width, height, source, overlay, cropLeft, cropTop, cropWidth, cropHeight }: LakeSurface, time: number) {
  const ending = 1 - smooth((time - (GUIDED_EXHALE_SECONDS - 1.04)) / .76)
  for (const cluster of COVE_FOLIAGE) {
    const age = time - cluster.delay
    const envelope = smooth(age / .55) * ending
    const gust = envelope * cluster.strength
    if (!gust) continue

    const bend = .56 * Math.sin(age * 4.2 + cluster.phase) + .29 * Math.sin(age * 7.9 + cluster.phase * 1.9) + .15 * Math.sin(age * 13.3)
    const flutter = .38 * Math.sin(age * 8.4 + cluster.phase) + .20 * Math.sin(age * 15.4 - cluster.phase)
    const cx = (cluster.x - cropLeft) / cropWidth * width
    const cy = (cluster.y - cropTop) / cropHeight * height
    const rx = cluster.width / cropWidth * width
    const ry = cluster.height / cropHeight * height
    const dx = gust * (.25 + bend) / cropWidth * width
    const dy = gust * (.22 * bend + .36 * flutter) / cropHeight * height

    for (let y = Math.max(0, Math.ceil(cy - ry)); y < Math.min(height, cy + ry); y++) {
      for (let x = Math.max(0, Math.ceil(cx - rx)); x < Math.min(width, cx + rx); x++) {
        const strength = 1 - smooth((Math.hypot((x - cx) / rx, (y - cy) / ry) - .26) / .74)
        if (strength < .01) continue
        const sx = Math.max(0, Math.min(width - 1, x - dx * strength))
        const sy = Math.max(0, Math.min(height - 1, y - dy * strength))
        const left = Math.floor(sx)
        const top = Math.floor(sy)
        const right = Math.min(left + 1, width - 1)
        const bottom = Math.min(top + 1, height - 1)
        const mx = sx - left
        const my = sy - top
        const pixel = (y * width + x) * 4
        for (let channel = 0; channel < 3; channel++) {
          const a = source[(top * width + left) * 4 + channel] * (1 - mx) + source[(top * width + right) * 4 + channel] * mx
          const b = source[(bottom * width + left) * 4 + channel] * (1 - mx) + source[(bottom * width + right) * 4 + channel] * mx
          overlay.data[pixel + channel] = a * (1 - my) + b * my
        }
        overlay.data[pixel + 3] = 255 * strength * envelope
      }
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
