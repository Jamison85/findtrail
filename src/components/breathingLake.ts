import { GUIDED_EXHALE_SECONDS, RIPPLE_TAIL_SECONDS } from './resetTiming'

export type LakeMotion = 'inhale' | 'hold' | 'exhale' | 'tail'

export function createBreathingLake(photo: HTMLImageElement, canvas: HTMLCanvasElement) {
  const context = typeof CanvasRenderingContext2D === 'undefined'
    ? null
    : canvas.getContext('2d', { willReadFrequently: true })
  let lake: ReturnType<typeof sampleLake> | undefined
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { lake = undefined })
  observer?.observe(photo)
  observer?.observe(canvas)

  return {
    draw(motion: LakeMotion | null, progress = 0, waveTime = -1) {
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
      if (waveTime >= 0) paintWaves(lake, waveTime)
      if (motion === 'inhale' || motion === 'hold') {
        paintMist(lake, motion === 'hold' ? 1 : progress)
      } else if (motion === 'exhale' && progress < .25) paintMist(lake, 1, 1 - smooth(progress / .25))
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

function paintMist({ width, height, source, overlay }: LakeSurface, progress: number, fade = 1) {
  const drift = smooth(progress)
  const opacity = smooth(progress / .22) * fade
  const center = .08 + drift * .30
  const depth = .08 + drift * .10
  const spread = .48 + drift * .36
  for (let y = 0; y < height; y++) {
    const level = y / height
    const distance = (level - center) / depth
    if (Math.abs(distance) >= 1) continue
    const body = (1 - distance * distance) ** 2 * opacity * smooth(level / .11) * smooth((1 - level) / .18)
    const textureY = ((1.3 + distance * .23 + drift * .37) * MIST_SIZE) % MIST_SIZE
    const row = Math.floor(textureY)
    const nextRow = (row + 1) % MIST_SIZE
    const blendY = textureY - row
    for (let x = 0; x < width; x++) {
      const across = x / width
      const textureX = ((1 + across / spread + .035 * drift) * MIST_SIZE) % MIST_SIZE
      const column = Math.floor(textureX)
      const nextColumn = (column + 1) % MIST_SIZE
      const blendX = textureX - column
      const near = mistTexture[row * MIST_SIZE + column] * (1 - blendX) + mistTexture[row * MIST_SIZE + nextColumn] * blendX
      const far = mistTexture[nextRow * MIST_SIZE + column] * (1 - blendX) + mistTexture[nextRow * MIST_SIZE + nextColumn] * blendX
      const texture = near * (1 - blendY) + far * blendY
      const cloud = Math.max(0, (texture - .19) / .81) ** 1.7
      const edges = smooth(Math.min(across, 1 - across) / .16)
      const pixel = (y * width + x) * 4
      const mist = 112 * body * cloud * edges
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

function paintWaves({ width, height, source, overlay }: LakeSurface, seconds: number) {
  const settling = 1 - smooth((seconds - GUIDED_EXHALE_SECONDS) / RIPPLE_TAIL_SECONDS)

  for (let y = 0; y < height; y++) {
    const depth = 1 - y / height
    if (depth < .22) continue
    const taper = settling * smooth((depth - .22) / .15) * smooth((1 - depth) / .30)
    for (let x = 0; x < width; x++) {
      const across = x / width - .5
      const distance = Math.hypot((depth - .22) / Math.max(.12, 1 - depth) * 3.8, across * 3.0)
      const emitted = seconds - distance / 2.08
      const envelope = smooth(emitted / .40) * (1 - smooth((emitted - GUIDED_EXHALE_SECONDS) / .18)) * (1 - .64 * smooth(distance / 19))
      if (envelope < .008) continue
      const slope = Math.sin(emitted * 8.1 + across * 1.6)
      const texture = Math.sin(emitted * 14.74 - across * 6.0) * .24
      const push = (slope + texture) * taper * envelope
      const reflectedY = Math.min(height - 1, Math.max(0, y + push * (8 - 3 * depth)))
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
      overlay.data[pixel + 3] = 255 * edgeFade * Math.min(1, envelope * 3) * smooth(taper / .09)
    }
  }
}
