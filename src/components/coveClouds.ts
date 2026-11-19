function smooth(value: number) {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

function prepareSky(photo: HTMLImageElement, layer: HTMLCanvasElement) {
  const { width, height } = layer.getBoundingClientRect()
  const sceneHeight = layer.parentElement?.getBoundingClientRect().height
  if (!width || !height || !sceneHeight) return null

  const scale = Math.min(window.devicePixelRatio || 1, 1.5, 900 / width)
  layer.width = Math.round(width * scale)
  layer.height = Math.round(height * scale)
  const cover = Math.max(layer.width / photo.naturalWidth, sceneHeight * scale / photo.naturalHeight)
  const photoWidth = photo.naturalWidth * cover
  const photoHeight = photo.naturalHeight * cover
  const left = (layer.width - photoWidth) / 2
  const top = (sceneHeight * scale - photoHeight) / 2
  const mask = document.createElement('canvas')
  mask.width = layer.width
  mask.height = layer.height
  const context = mask.getContext('2d')
  if (!context) return null

  // Feather the photo's open sky along the left canopy and the distant ridge.
  const alpha = context.createImageData(mask.width, mask.height)
  for (let y = 0; y < mask.height; y++) {
    const photoY = (y - top) / photoHeight
    const canopy = .35 + .52 * photoY
    for (let x = 0; x < mask.width; x++) {
      const photoX = (x - left) / photoWidth
      const ridge = .390 - .034 * smooth((photoX - .57) / .43)
      const openSky = smooth((photoX - canopy) / .065) * smooth((ridge - photoY) / .050)
      alpha.data[(y * mask.width + x) * 4 + 3] = 255 * openSky
    }
  }
  context.putImageData(alpha, 0, 0)
  return { mask, left, top, photoWidth, photoHeight }
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
    sky ??= prepareSky(photo, layer)
    if (!sky) return

    const { mask, left, top, photoWidth, photoHeight } = sky
    // Move the existing cloud bands in from the upper-right as they approach.
    const advance = .12 * breath
    context.clearRect(0, 0, layer.width, layer.height)
    context.drawImage(photo, left - photoWidth * advance, top, photoWidth * (1 + advance), photoHeight * (1 + advance))
    context.globalCompositeOperation = 'destination-in'
    context.drawImage(mask, 0, 0)
    context.globalCompositeOperation = 'source-over'
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
