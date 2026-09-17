import { useEffect, useRef } from 'react'

interface HorizonRipplesProps {
  reducedMotion: boolean
  restartKey: number
}

interface TouchRipple {
  x: number
  y: number
  startedAt: number
}

const RESET_SECONDS = 30

function ease(value: number) {
  return value * value * (3 - (2 * value))
}

function breathAmount(elapsed: number) {
  const cycle = elapsed % 10
  if (cycle < 4) return ease(cycle / 4)
  return 1 - ease((cycle - 4) / 6)
}

export function HorizonRipples({ reducedMotion, restartKey }: HorizonRipplesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return
    const canvasElement = canvasRef.current
    if (!canvasElement) return
    const drawingContext = canvasElement.getContext('2d')
    if (!drawingContext) return
    const canvas = canvasElement
    const context = drawingContext

    let animationFrame = 0
    let lastFrame = 0
    let width = 0
    let height = 0
    const startedAt = performance.now()
    const touchRipples: TouchRipple[] = []

    function resize() {
      const rect = canvas.getBoundingClientRect()
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
    }

    function draw(now: number) {
      const elapsed = reducedMotion ? 5 : Math.min((now - startedAt) / 1000, RESET_SECONDS)
      const breath = reducedMotion ? .72 : breathAmount(elapsed)
      const horizon = height * (.49 + (breath * .035))
      const spread = .82 + (breath * .24)

      const backdrop = context.createLinearGradient(0, 0, 0, height)
      backdrop.addColorStop(0, '#081713')
      backdrop.addColorStop(.42, '#0e2922')
      backdrop.addColorStop(.7, '#143d33')
      backdrop.addColorStop(1, '#081a16')
      context.fillStyle = backdrop
      context.fillRect(0, 0, width, height)

      const ambient = context.createRadialGradient(width * .52, horizon, 0, width * .52, horizon, width * .78)
      ambient.addColorStop(0, `rgba(245, 181, 101, ${.13 + (breath * .12)})`)
      ambient.addColorStop(.35, `rgba(40, 112, 91, ${.16 + (breath * .08)})`)
      ambient.addColorStop(1, 'rgba(8, 23, 19, 0)')
      context.fillStyle = ambient
      context.fillRect(0, 0, width, height)

      context.save()
      context.globalCompositeOperation = 'screen'
      context.lineCap = 'round'

      for (let band = 0; band < 6; band += 1) {
        const amber = band < 2
        const alpha = (amber ? .17 : .1) + (breath * (amber ? .13 : .08))
        const yOffset = (band - 2.5) * 28 * spread
        const amplitude = (9 + (band * 2.2)) * spread
        const frequency = 1.1 + (band * .19)
        const travel = elapsed * (.34 + (band * .035))

        context.beginPath()
        for (let x = -24; x <= width + 24; x += 10) {
          const normalized = x / Math.max(width, 1)
          const edgeLift = Math.pow(Math.abs(normalized - .5) * 2, 1.6) * (13 + (breath * 17))
          const wave = Math.sin((normalized * Math.PI * 2 * frequency) - travel + (band * .7)) * amplitude
          const detail = Math.sin((normalized * Math.PI * 5.3) + (travel * .58) + band) * 3.5
          const y = horizon + yOffset + wave + detail + edgeLift
          if (x === -24) context.moveTo(x, y)
          else context.lineTo(x, y)
        }
        context.strokeStyle = amber
          ? `rgba(245, 181, 101, ${alpha})`
          : `rgba(92, 181, 151, ${alpha})`
        context.lineWidth = amber ? 12 + (breath * 8) : 18 + (breath * 10)
        context.filter = `blur(${amber ? 8 : 13}px)`
        context.stroke()
      }

      context.restore()
      context.filter = 'none'

      for (let index = touchRipples.length - 1; index >= 0; index -= 1) {
        const ripple = touchRipples[index]
        const age = (now - ripple.startedAt) / 1400
        if (age >= 1) {
          touchRipples.splice(index, 1)
          continue
        }
        context.beginPath()
        context.ellipse(ripple.x, ripple.y, 18 + (age * 110), 7 + (age * 32), 0, 0, Math.PI * 2)
        context.strokeStyle = `rgba(253, 242, 226, ${(1 - age) * .41})`
        context.lineWidth = 2.2 - age
        context.stroke()
      }
    }

    function addRipple(event: PointerEvent) {
      if (reducedMotion) return
      const rect = canvas.getBoundingClientRect()
      touchRipples.push({ x: event.clientX - rect.left, y: event.clientY - rect.top, startedAt: performance.now() })
      if (touchRipples.length > 5) touchRipples.shift()
    }

    function handlePointerMove(event: PointerEvent) {
      if (event.buttons || event.pointerType === 'touch') addRipple(event)
    }

    function animate(now: number) {
      if (now - lastFrame >= 30) {
        lastFrame = now
        draw(now)
      }
      if ((now - startedAt) / 1000 < RESET_SECONDS) animationFrame = window.requestAnimationFrame(animate)
    }

    function handleResize() {
      resize()
      if (reducedMotion) draw(startedAt)
    }

    resize()
    if (reducedMotion) draw(startedAt)
    else animationFrame = window.requestAnimationFrame(animate)
    window.addEventListener('resize', handleResize)
    canvas.addEventListener('pointerdown', addRipple)
    canvas.addEventListener('pointermove', handlePointerMove)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
      canvas.removeEventListener('pointerdown', addRipple)
      canvas.removeEventListener('pointermove', handlePointerMove)
    }
  }, [reducedMotion, restartKey])

  return <canvas ref={canvasRef} className="horizon-ripples" aria-hidden="true" />
}
