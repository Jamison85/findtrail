function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function prepareSky(photo: HTMLImageElement, layer: HTMLCanvasElement, context: CanvasRenderingContext2D) {
  const { width, height } = layer.getBoundingClientRect()
  const sceneHeight = layer.parentElement?.getBoundingClientRect().height
  if (!width || !height || !sceneHeight) return null

  const scale = Math.min(window.devicePixelRatio || 1, 1.25, 720 / width)
  layer.width = Math.round(width * scale)
  layer.height = Math.round(height * scale)
  const cover = Math.max(layer.width / photo.naturalWidth, sceneHeight * scale / photo.naturalHeight)
  const photoWidth = photo.naturalWidth * cover
  const photoHeight = photo.naturalHeight * cover
  const left = (layer.width - photoWidth) / 2
  const top = (sceneHeight * scale - photoHeight) / 2
  context.drawImage(photo, left, top, photoWidth, photoHeight)
  const source = context.getImageData(0, 0, layer.width, layer.height).data
  const frame = context.createImageData(layer.width, layer.height)
  const drift = new Float32Array(layer.width * layer.height)

  // Bring the drift gradually to zero around the canopy and the distant ridge.
  for (let y = 0; y < layer.height; y++) {
    const photoY = (y - top) / photoHeight
    const canopy = .35 + .52 * photoY
    for (let x = 0; x < layer.width; x++) {
      const photoX = (x - left) / photoWidth
      const ridge = .390 - .034 * smooth((photoX - .57) / .43)
      const i = y * layer.width + x
      drift[i] = smooth((photoX - canopy) / .18) * smooth((ridge - photoY) / .105)
      frame.data[i * 4 + 3] = 255 * smooth(drift[i] / .025)
    }
  }
  return { source, frame, drift }
}

function drawSky(context: CanvasRenderingContext2D, sky: NonNullable<ReturnType<typeof prepareSky>>, position: number) {
  const { source, frame, drift } = sky
  const { width, height, data } = frame
  const advance = 1 - 1 / (1 + .12 * position)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x
      if (!data[i * 4 + 3]) continue
      // Remap the wisps continuously instead of blending two cloud positions.
      const shift = advance * drift[i]
      const sx = x + (width - 1 - x) * shift
      const sy = y * (1 - .68 * shift)
      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const x1 = Math.min(x0 + 1, width - 1)
      const y1 = Math.min(y0 + 1, height - 1)
      const a = (y0 * width + x0) * 4
      const b = (y0 * width + x1) * 4
      const c = (y1 * width + x0) * 4
      const d = (y1 * width + x1) * 4
      const u = sx - x0
      const v = sy - y0
      for (let channel = 0; channel < 3; channel++) {
        const upper = source[a + channel] + u * (source[b + channel] - source[a + channel])
        const lower = source[c + channel] + u * (source[d + channel] - source[c + channel])
        data[i * 4 + channel] = upper + v * (lower - upper)
      }
    }
  }
  context.putImageData(frame, 0, 0)
}

export function createCoveClouds(photo: HTMLImageElement, layer: HTMLCanvasElement) {
  const context = typeof CanvasRenderingContext2D === 'undefined' ? null : layer.getContext('2d')
  let sky: ReturnType<typeof prepareSky> = null
  let breath = 0
  let painted = 0

  function paint() {
    if (!context || !photo.naturalWidth) return
    if (breath === 0) {
      layer.removeAttribute('data-active')
      painted = 0
      return
    }
    if (sky && painted === breath) return
    sky ??= prepareSky(photo, layer, context)
    if (!sky) return
    drawSky(context, sky, breath)
    if (!layer.hasAttribute('data-active')) layer.dataset.active = 'true'
    painted = breath
  }

  const resize = context && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => {
    sky = null
    paint()
  }) : null
  resize?.observe(layer)

  return {
    draw(position: number) {
      breath = position
      paint()
    },
    dispose() {
      resize?.disconnect()
      layer.removeAttribute('data-active')
    },
  }
}
