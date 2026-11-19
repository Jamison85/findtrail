export const RIPPLE_SECONDS = 2.2

export function createWaterRipple(photo: HTMLImageElement, canvas: HTMLCanvasElement) {
  const context = typeof CanvasRenderingContext2D === 'undefined'
    ? null
    : canvas.getContext('2d', { willReadFrequently: true })
  let surface: ReturnType<typeof sampleLake> | undefined
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => { surface = undefined })
  observer?.observe(photo)
  observer?.observe(canvas)

  function draw(age: number, reducedMotion: boolean) {
    const visible = age < (reducedMotion ? .65 : RIPPLE_SECONDS)
    canvas.toggleAttribute('data-rippling', visible)
    if (!visible || !context || !photo.naturalWidth) return
    surface ??= sampleLake(photo, canvas, context)
    if (surface) paintRipple(context, surface, reducedMotion ? .35 : age)
  }

  return {
    draw,
    dispose() {
      observer?.disconnect()
      canvas.removeAttribute('data-rippling')
    },
  }
}

function sampleLake(photo: HTMLImageElement, canvas: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const frame = canvas.getBoundingClientRect()
  const lake = photo.getBoundingClientRect()
  if (!frame.width || !frame.height) return
  const density = Math.min(devicePixelRatio || 1, 1.25)
  const width = Math.round(frame.width * density)
  const height = Math.round(frame.height * density)
  canvas.width = width
  canvas.height = height

  // Use the same centered cover crop as the lake image under the canvas.
  const cover = Math.max(lake.width / photo.naturalWidth, lake.height / photo.naturalHeight)
  const photoWidth = photo.naturalWidth * cover
  const photoHeight = photo.naturalHeight * cover
  const left = lake.left + (lake.width - photoWidth) / 2 - frame.left
  const top = lake.top + (lake.height - photoHeight) / 2 - frame.top
  context.drawImage(photo, left * density, top * density, photoWidth * density, photoHeight * density)

  const source = context.getImageData(0, 0, width, height)
  const output = context.createImageData(width, height)
  const radius = new Float32Array(width * height)
  const angle = new Float32Array(radius.length)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const horizontal = x - width / 2
      // A low viewpoint compresses the waves against the surface plane.
      const vertical = (y - height / 2) / .27
      const pixel = y * width + x
      radius[pixel] = Math.hypot(horizontal, vertical)
      angle[pixel] = (horizontal * .28 + vertical * .7) / (radius[pixel] || 1)
    }
  }
  return { source, output, radius, angle, width, height, density }
}

function paintRipple(context: CanvasRenderingContext2D, surface: NonNullable<ReturnType<typeof sampleLake>>, age: number) {
  const { source, output, radius, angle, width, height, density } = surface
  const progress = age / RIPPLE_SECONDS
  const front = Math.pow(progress, .76) * width * .48
  const energy = (1 - progress) ** 1.4
  output.data.fill(0)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixel = y * width + x
      const distance = (front - radius[pixel]) / density
      if (distance < -5 || distance > 39) continue

      // The moving slopes pull pixels from the original reflection. A warm
      // highlight and a dark trough sit on opposite sides of each crest.
      const envelope = Math.min(1, (distance + 5) / 5) * (1 - Math.max(0, distance) / 39) ** 2
      const slope = Math.sin(distance * .59) * envelope * energy
      const sampleY = Math.max(0, Math.min(height - 1, y + slope * 6.4 * density))
      const nearY = Math.floor(sampleY)
      const mix = sampleY - nearY
      const near = (nearY * width + x) * 4
      const far = (Math.min(height - 1, nearY + 1) * width + x) * 4
      const offset = pixel * 4
      const light = slope * (30 + angle[pixel] * 19)

      output.data[offset] = source.data[near] * (1 - mix) + source.data[far] * mix + light
      output.data[offset + 1] = source.data[near + 1] * (1 - mix) + source.data[far + 1] * mix + light * .76
      output.data[offset + 2] = source.data[near + 2] * (1 - mix) + source.data[far + 2] * mix + light * .51
      output.data[offset + 3] = Math.min(255, envelope * 640)
    }
  }
  context.putImageData(output, 0, 0)
}
