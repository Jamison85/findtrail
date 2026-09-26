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
      context.clearRect(0, 0, width, height)
      context.drawImage(still, 0, 0)
      waterReady = true
    }

    function drawWater(now: number) {
      if (!waterReady || (now - lastFrame < 33 && !reducedMotion)) return
      lastFrame = now

      const width = canvas.width
      const height = canvas.height
      const horizon = height * .486
      const contactY = height * .645
      const seconds = (now - sceneStartedAt) / 1000
      const age = (now - impactAt) / 1000
      const rippleTime = Math.min(1, Math.max(0, age / RIPPLE_SECONDS))
      const rippleActive = age >= 0 && age <= RIPPLE_SECONDS && !reducedMotion
      const rippleAttack = Math.min(1, Math.max(0, age / .16))
      const rippleTail = 1 - Math.min(1, Math.max(0, (rippleTime - .58) / .42))
      const rippleFade = rippleActive ? rippleAttack * rippleTail : 0
      // The same single water wave, allowed to travel beyond both screen edges.
      const rippleRadius = (1 - Math.pow(1 - rippleTime, 1.36)) * width * .72
      const ovalScale = .23 + (rippleTime * .025)
      const contactFade = Math.max(0, 1 - (age / .55))
      const centerX = width * .5
      const protectedHorizonY = horizon + Math.max(24, height * .032)
      const fullRippleY = horizon + Math.max(66, height * .078)

      context.clearRect(0, 0, width, height)
      context.drawImage(still, 0, 0)
      if (reducedMotion) return

      const tileWidth = Math.max(12, Math.round(width / 28))
      const tileHeight = 4

      for (let y = Math.floor(horizon); y < height; y += tileHeight) {
        const depth = Math.max(0, (y - horizon) / (height - horizon))
        const horizonGuard = Math.min(1, Math.max(0, (y - horizon) / 22))
        const strength = Math.pow(depth, .72) * horizonGuard

        for (let x = 0; x < width; x += tileWidth) {
          const sampleX = x + (tileWidth * .5)
          const sampleY = y + (tileHeight * .5)
          let shiftX = strength * (
            (Math.sin((sampleY * .071) + (seconds * 1.05)) * 2.1)
            + (Math.sin((sampleX * .031) - (sampleY * .018) - (seconds * .72)) * 1.35)
          )
          let shiftY = strength * (
            (Math.sin((sampleX * .047) + (sampleY * .014) + (seconds * .66)) * 1.45)
            + (Math.sin((sampleY * .113) - (seconds * .48)) * .75)
          )

          if (rippleActive) {
            const dx = sampleX - centerX
            const screenDy = sampleY - contactY
            const ovalDy = screenDy / ovalScale
            const distance = Math.sqrt((dx * dx) + (ovalDy * ovalDy))
            const fromRing = distance - rippleRadius
            const packet = Math.exp(-(fromRing * fromRing) / (2 * 19 * 19))
            const rings = Math.sin(fromRing * .43) * packet
            const perspectiveWeight = screenDy >= 0 ? 1 : .72
            const guardProgress = Math.min(1, Math.max(0, (sampleY - protectedHorizonY) / Math.max(1, fullRippleY - protectedHorizonY)))
            const rippleGuard = guardProgress * guardProgress * (3 - (2 * guardProgress))
            const pulse = rings * rippleFade * perspectiveWeight * rippleGuard * 10
            const length = Math.max(1, distance)

            shiftX += (dx / length) * pulse
            shiftY += (ovalDy / length) * pulse * .18

            const dimple = Math.exp(-(distance * distance) / (2 * 12 * 12))
            shiftY += dimple * contactFade * rippleGuard * 4
          }

          const sourceX = Math.max(0, Math.min(width - tileWidth, x + shiftX))
          const sourceY = Math.max(horizon, Math.min(height - tileHeight, y + shiftY))
          const drawWidth = Math.min(tileWidth + 1, width - x, width - sourceX)
          const drawHeight = Math.min(tileHeight + 1, height - y, height - sourceY)

          context.drawImage(still, sourceX, sourceY, drawWidth, drawHeight, x, y, drawWidth, drawHeight)
        }
      }
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
