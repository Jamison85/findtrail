import { useEffect, useRef } from 'react'

interface HorizonRipplesProps {
  reducedMotion: boolean
  startedAt: number | null
}

const WATER_IMAGE = `${import.meta.env.BASE_URL}findtrail-reset-lake.webp`
const RESET_SECONDS = 30
const CYCLE_SECONDS = 10
const CONTACT_SECONDS = 7.2
const RIPPLE_SECONDS = 8.4

export function HorizonRipples({ reducedMotion, startedAt }: HorizonRipplesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    const canvasElement = canvasRef.current
    if (!canvasElement) return
    const drawingContext = canvasElement.getContext('2d')
    if (!drawingContext) return
    const canvas = canvasElement
    const context = drawingContext

    const still = document.createElement('canvas')
    const offscreenContext = still.getContext('2d')
    if (!offscreenContext) return
    const stillContext = offscreenContext

    const source = new Image()
    let animationFrame = 0
    let resizeObserver: ResizeObserver | null = null
    let cancelled = false
    let waterReady = false
    let lastFrame = 0
    let lastImpactCycle = -1
    let impactAt = Number.NEGATIVE_INFINITY
    let stillPixels: ImageData | null = null
    let framePixels: ImageData | null = null
    const sceneStartedAt = performance.now()

    function paintStill() {
      if (!source.naturalWidth || !source.naturalHeight) return
      const rect = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))

      canvas.width = width
      canvas.height = height
      still.width = width
      still.height = height

      const imageRatio = source.naturalWidth / source.naturalHeight
      const canvasRatio = width / height
      let sourceX = 0
      let sourceY = 0
      let sourceWidth = source.naturalWidth
      let sourceHeight = source.naturalHeight

      if (imageRatio > canvasRatio) {
        sourceWidth = source.naturalHeight * canvasRatio
        sourceX = (source.naturalWidth - sourceWidth) / 2
      } else {
        sourceHeight = source.naturalWidth / canvasRatio
        sourceY = (source.naturalHeight - sourceHeight) / 2
      }

      stillContext.clearRect(0, 0, width, height)
      stillContext.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
      stillPixels = stillContext.getImageData(0, 0, width, height)
      framePixels = context.createImageData(width, height)
      context.clearRect(0, 0, width, height)
      context.drawImage(still, 0, 0)
      waterReady = true
    }

    function drawWater(now: number) {
      if (!waterReady || (now - lastFrame < 33 && !reducedMotion)) return
      lastFrame = now

      const width = canvas.width
      const height = canvas.height
      const contactY = height * .625
      const age = (now - impactAt) / 1000
      const rippleTime = Math.min(1, Math.max(0, age / RIPPLE_SECONDS))
      const rippleActive = age >= 0 && age <= RIPPLE_SECONDS && !reducedMotion
      const rippleAttack = Math.min(1, Math.max(0, age / .16))
      const rippleTail = 1 - Math.min(1, Math.max(0, (rippleTime - .58) / .42))
      const rippleFade = rippleActive ? rippleAttack * rippleTail : 0
      // The same single water wave, allowed to travel beyond both screen edges.
      const rippleRadius = (1 - Math.pow(1 - rippleTime, 1.36)) * width * .72
      const ovalScale = .23 + (rippleTime * .025)
      const centerX = width * .5

      if (!rippleActive || !stillPixels || !framePixels || rippleFade <= 0) {
        context.drawImage(still, 0, 0)
        return
      }

      // Refract the lake at the canvas's native pixel resolution. The narrow
      // warm crest and adjacent shadow are sampled from the water itself, so
      // the disturbance reads as one wave rather than an outlined ellipse.
      const pixels = stillPixels.data
      const frame = framePixels.data
      frame.set(pixels)
      const reach = rippleRadius + 38
      const top = Math.max(Math.ceil(height * .535), Math.floor(contactY - reach * ovalScale))
      const bottom = Math.min(height - 1, Math.ceil(contactY + reach * ovalScale))
      const left = Math.max(0, Math.floor(centerX - reach))
      const right = Math.min(width - 1, Math.ceil(centerX + reach))

      for (let y = top; y <= bottom; y++) {
        const dy = (y - contactY) / ovalScale
        for (let x = left; x <= right; x++) {
          const dx = x - centerX
          const distance = Math.hypot(dx, dy)
          const angle = Math.atan2(dy, dx)
          const bend = Math.sin(angle * 3.2 + age * .13) * 3.5 + Math.sin(angle * 7.1 - age * .1) * 1.3
          const fromCrest = distance - rippleRadius - bend
          if (Math.abs(fromCrest) > 38) continue

          const crest = Math.exp(-(fromCrest * fromCrest) / (2 * 10 * 10))
          const trough = Math.exp(-((fromCrest - 17) ** 2) / (2 * 12 * 12))
          const wave = (fromCrest / 24) * Math.exp(-(fromCrest * fromCrest) / (2 * 18 * 18))
          const displacement = wave * rippleFade * 13
          const sampleX = Math.max(0, Math.min(width - 1.001, x - dx / Math.max(1, distance) * displacement))
          const sampleY = Math.max(0, Math.min(height - 1.001, y - dy / Math.max(1, distance) * displacement * ovalScale * .45))
          const sx = Math.floor(sampleX)
          const sy = Math.floor(sampleY)
          const fx = sampleX - sx
          const fy = sampleY - sy
          const a = (sy * width + sx) * 4
          const b = a + 4
          const c = a + width * 4
          const d = c + 4
          const index = (y * width + x) * 4
          const variation = .8 + Math.sin(angle * 13 + age * .35) * .13 + Math.sin(angle * 29 - age * .2) * .07
          const light = Math.max(0, crest * .2 - trough * .07) * rippleFade * variation
          const shade = Math.max(0, trough * .075 - crest * .035) * rippleFade
          for (let channel = 0; channel < 3; channel++) {
            const upper = pixels[a + channel] * (1 - fx) + pixels[b + channel] * fx
            const lower = pixels[c + channel] * (1 - fx) + pixels[d + channel] * fx
            const sampled = upper * (1 - fy) + lower * fy
            const warmth = channel === 0 ? 234 : channel === 1 ? 204 : 159
            frame[index + channel] = sampled * (1 - light - shade) + warmth * light
          }
        }
      }
      context.putImageData(framePixels, 0, 0)
    }

    function tick(now: number) {
      if (cancelled) return
      const elapsed = startedAt === null ? -1 : (now - startedAt) / 1000
      const cycleIndex = Math.floor(elapsed / CYCLE_SECONDS)
      const cyclePhase = elapsed % CYCLE_SECONDS

      if (elapsed >= 0 && elapsed < RESET_SECONDS && cyclePhase >= CONTACT_SECONDS && lastImpactCycle !== cycleIndex) {
        lastImpactCycle = cycleIndex
        impactAt = startedAt! + (cycleIndex * CYCLE_SECONDS + CONTACT_SECONDS) * 1000
      }

      drawWater(now)
      if (startedAt === null || elapsed < RESET_SECONDS + RIPPLE_SECONDS) animationFrame = window.requestAnimationFrame(tick)
    }

    function begin() {
      if (cancelled) return
      paintStill()
      resizeObserver = new ResizeObserver(() => {
        paintStill()
        drawWater(reducedMotion ? sceneStartedAt : performance.now())
      })
      resizeObserver.observe(canvas)
      drawWater(sceneStartedAt)
      if (!reducedMotion) animationFrame = window.requestAnimationFrame(tick)
    }

    source.decoding = 'async'
    source.src = WATER_IMAGE
    if (source.complete && source.naturalWidth) begin()
    else source.addEventListener('load', begin, { once: true })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      source.removeEventListener('load', begin)
    }
  }, [reducedMotion, startedAt])

  return <canvas ref={canvasRef} className="horizon-ripples" style={{ backgroundImage: `url(${WATER_IMAGE})` }} aria-hidden="true" />
}
