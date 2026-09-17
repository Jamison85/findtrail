import { useEffect, useRef } from 'react'

interface HorizonRipplesProps {
  reducedMotion: boolean
  restartKey: number
}

const RESET_SECONDS = 30

function smoothstep(value: number) {
  return value * value * (3 - (2 * value))
}

function breathAmount(elapsed: number) {
  const cycle = elapsed % 10
  if (cycle < 4) return smoothstep(cycle / 4)
  return 1 - smoothstep((cycle - 4) / 6)
}

function traceMountains(
  context: CanvasRenderingContext2D,
  width: number,
  baseY: number,
  points: Array<[number, number]>,
) {
  context.beginPath()
  context.moveTo(0, baseY)
  for (const [x, lift] of points) context.lineTo(width * x, baseY - lift)
  context.lineTo(width, baseY)
  context.closePath()
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

    const farRange: Array<[number, number]> = [
      [0, 14], [.08, 32], [.15, 22], [.23, 49], [.31, 21], [.39, 36], [.47, 18],
      [.55, 27], [.62, 15], [.71, 34], [.79, 21], [.88, 43], [.95, 20], [1, 28],
    ]
    const nearRange: Array<[number, number]> = [
      [0, 20], [.09, 53], [.18, 26], [.28, 18], [.37, 42], [.46, 15], [.57, 31],
      [.66, 17], [.76, 37], [.85, 19], [.94, 47], [1, 25],
    ]

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
      const elapsed = reducedMotion ? 4 : Math.min((now - startedAt) / 1000, RESET_SECONDS)
      const breath = reducedMotion ? .65 : breathAmount(elapsed)
      const horizon = height * .475
      const amber = .78 + (breath * .12)

      const sky = context.createLinearGradient(0, 0, 0, horizon + 18)
      sky.addColorStop(0, '#06151c')
      sky.addColorStop(.45, '#0b2427')
      sky.addColorStop(.76, '#173531')
      sky.addColorStop(1, `rgba(120, 74, 43, ${amber})`)
      context.fillStyle = sky
      context.fillRect(0, 0, width, horizon + 18)

      const dawn = context.createRadialGradient(width * .51, horizon - 2, 0, width * .51, horizon - 2, width * .48)
      dawn.addColorStop(0, `rgba(244, 169, 80, ${.28 + (breath * .055)})`)
      dawn.addColorStop(.26, 'rgba(190, 110, 58, .17)')
      dawn.addColorStop(.62, 'rgba(38, 74, 65, .06)')
      dawn.addColorStop(1, 'rgba(7, 22, 27, 0)')
      context.fillStyle = dawn
      context.fillRect(0, horizon - (width * .45), width, width * .9)

      const water = context.createLinearGradient(0, horizon, 0, height)
      water.addColorStop(0, '#163c37')
      water.addColorStop(.24, '#0c3532')
      water.addColorStop(.62, '#082723')
      water.addColorStop(1, '#041b1a')
      context.fillStyle = water
      context.fillRect(0, horizon, width, height - horizon)

      context.fillStyle = '#183330'
      traceMountains(context, width, horizon + 4, farRange)
      context.fill()

      context.fillStyle = '#0a2223'
      traceMountains(context, width, horizon + 11, nearRange)
      context.fill()

      context.save()
      context.translate(0, (horizon + 12) * 2)
      context.scale(1, -1)
      context.globalAlpha = .2
      context.fillStyle = '#183330'
      traceMountains(context, width, horizon + 4, farRange)
      context.fill()
      context.globalAlpha = .28
      context.fillStyle = '#0a2223'
      traceMountains(context, width, horizon + 11, nearRange)
      context.fill()
      context.restore()

      const reflection = context.createLinearGradient(0, horizon, 0, height * .78)
      reflection.addColorStop(0, `rgba(236, 158, 77, ${.12 + (breath * .03)})`)
      reflection.addColorStop(.28, 'rgba(184, 118, 62, .08)')
      reflection.addColorStop(1, 'rgba(22, 61, 53, 0)')
      context.save()
      context.globalCompositeOperation = 'screen'
      context.fillStyle = reflection
      context.beginPath()
      context.moveTo(width * .45, horizon)
      context.lineTo(width * .57, horizon)
      context.lineTo(width * .63, height * .78)
      context.lineTo(width * .38, height * .78)
      context.closePath()
      context.fill()
      context.restore()

      context.strokeStyle = `rgba(241, 182, 101, ${.22 + (breath * .035)})`
      context.lineWidth = .75
      context.beginPath()
      context.moveTo(width * .12, horizon + 10)
      context.lineTo(width * .88, horizon + 10)
      context.stroke()

      const travel = elapsed * .18
      for (let band = 0; band < 13; band += 1) {
        const y = horizon + 26 + (band * ((height - horizon) / 15))
        const alpha = Math.max(.018, .07 - (band * .0035))
        context.beginPath()
        for (let x = -10; x <= width + 10; x += 12) {
          const wave = Math.sin((x / Math.max(width, 1)) * Math.PI * (2.2 + band * .11) + travel + band * .47) * (1.2 + band * .06)
          if (x === -10) context.moveTo(x, y + wave)
          else context.lineTo(x, y + wave)
        }
        context.strokeStyle = `rgba(198, 220, 208, ${alpha})`
        context.lineWidth = .7
        context.stroke()
      }

      const lowerShade = context.createLinearGradient(0, height * .7, 0, height)
      lowerShade.addColorStop(0, 'rgba(3, 21, 19, 0)')
      lowerShade.addColorStop(1, 'rgba(2, 16, 15, .52)')
      context.fillStyle = lowerShade
      context.fillRect(0, height * .7, width, height * .3)
    }

    function animate(now: number) {
      if (now - lastFrame >= 32) {
        lastFrame = now
        draw(now)
      }
      if ((now - startedAt) / 1000 < RESET_SECONDS) animationFrame = window.requestAnimationFrame(animate)
    }

    function handleResize() {
      resize()
      draw(reducedMotion ? startedAt : performance.now())
    }

    resize()
    draw(startedAt)
    if (!reducedMotion) animationFrame = window.requestAnimationFrame(animate)
    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', handleResize)
    }
  }, [reducedMotion, restartKey])

  return <canvas ref={canvasRef} className="horizon-ripples" aria-hidden="true" />
}
