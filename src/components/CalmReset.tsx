import { useEffect, useRef, useState } from 'react'
import type { ActiveSearch, Screen } from '../types'
import { Icon } from './Icon'
import { clearNextStep } from './clearNextStep'
import { CYCLE_SECONDS, EXHALE_SECONDS, HOLD_SECONDS, INHALE_SECONDS, RESET_CYCLES, TOTAL_SECONDS } from './resetTiming'
import { createWaterRipple, RIPPLE_SECONDS } from './waterRipple'

interface CalmResetProps {
  search: ActiveSearch | null
  returnScreen: Screen
  reducedMotion?: boolean
  onResume: () => void
}

const phaseLabels = {
  idle: 'Follow one breath at a time.',
  inhale: 'Breathe in',
  hold: 'Pause if comfortable',
  exhale: 'Breathe out',
  complete: 'Three breaths complete.',
}

const DROP_SECONDS = .62
const HOLD_END = INHALE_SECONDS + HOLD_SECONDS
const LAKE_IMAGE = `${import.meta.env.BASE_URL}findtrail-still-lake.webp`

export function CalmReset({ search, returnScreen, reducedMotion = false, onResume }: CalmResetProps) {
  const [phase, setPhase] = useState<keyof typeof phaseLabels>('idle')
  const [running, setRunning] = useState(false)
  const layout = useRef<HTMLDivElement>(null)
  const lake = useRef<HTMLImageElement>(null)
  const water = useRef<HTMLCanvasElement>(null)
  const drop = useRef<HTMLDivElement>(null)
  const elapsed = useRef(0)
  const next = clearNextStep(search, returnScreen)

  useEffect(() => {
    if (!running || !layout.current || !lake.current || !water.current || !drop.current) return
    const view = layout.current
    const droplet = drop.current
    const ripple = createWaterRipple(lake.current, water.current)
    const startedAt = performance.now() - elapsed.current * 1000
    let frame = 0
    let lastPhase: keyof typeof phaseLabels | undefined

    function draw(now: number) {
      const seconds = Math.max(0, (now - startedAt) / 1000)
      elapsed.current = seconds
      const cycle = seconds % CYCLE_SECONDS
      const finished = seconds >= TOTAL_SECONDS
      const nextPhase = finished ? 'complete' : cycle < INHALE_SECONDS ? 'inhale' : cycle < HOLD_END ? 'hold' : 'exhale'
      if (nextPhase !== lastPhase) {
        lastPhase = nextPhase
        setPhase(nextPhase)
      }

      const breath = finished ? 0 : cycle < INHALE_SECONDS ? cycle / INHALE_SECONDS : Math.min(1, (CYCLE_SECONDS - cycle) / EXHALE_SECONDS)
      const width = reducedMotion ? 1 : .23 + .77 * (.5 - .5 * Math.cos(Math.PI * breath))
      view.style.setProperty('--breath-width', String(width))

      const fall = (cycle - (CYCLE_SECONDS - DROP_SECONDS)) / DROP_SECONDS
      const falling = !reducedMotion && !finished && fall >= 0
      droplet.style.opacity = falling ? String(Math.min(1, fall * 8)) : '0'
      if (falling) droplet.style.setProperty('--drop-y', `${-68 * (1 - fall ** 2)}px`)

      const impacts = Math.min(RESET_CYCLES, Math.floor(seconds / CYCLE_SECONDS))
      const age = seconds - impacts * CYCLE_SECONDS
      ripple.draw(impacts > 0 ? age : Infinity, reducedMotion)
      if (finished && age >= RIPPLE_SECONDS) setRunning(false)
      else frame = requestAnimationFrame(draw)
    }

    function pauseWhenHidden() {
      if (document.hidden) setRunning(false)
    }

    frame = requestAnimationFrame(draw)
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      cancelAnimationFrame(frame)
      ripple.dispose()
      droplet.style.opacity = '0'
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [reducedMotion, running])

  function toggleBreathing() {
    if (running && phase !== 'complete') {
      setRunning(false)
      return
    }
    if (phase === 'idle' || phase === 'complete') {
      elapsed.current = 0
      setPhase('inhale')
    }
    setRunning(true)
  }

  return (
    <section className="view reset-journey" aria-labelledby="view-heading">
      <div className="reset-journey__scene" aria-hidden="true">
        <img ref={lake} className="reset-journey__lake" src={LAKE_IMAGE} alt="" />
        <div className="reset-water">
          <canvas ref={water} className="reset-water__ripple" />
          <div ref={drop} className="reset-water__drop" />
        </div>
      </div>
      <div ref={layout} className="reset-journey__layout" data-reduced-motion={reducedMotion}>
        <header className="reset-journey__top">
          <strong>Reset</strong>
          <button className="icon-button reset-journey__exit" onClick={onResume} aria-label="Close reset"><Icon name="close" size={21} /></button>
        </header>
        <div className="reset-journey__message">
          <h1 id="view-heading" tabIndex={-1}>Take a moment.</h1>
          {search && <p>Your search is saved.</p>}
        </div>
        <div className="reset-breathing">
          <p className="reset-breathing__phase" role="status">{!running && phase !== 'idle' && phase !== 'complete' ? 'Breathing paused' : phaseLabels[phase]}</p>
          <div className="reset-breathing__trace" aria-hidden="true" />
          <button
            className="reset-breathing__control"
            disabled={phase === 'complete' && running}
            onClick={toggleBreathing}
          >
            {phase === 'idle' ? 'Start breathing' : phase === 'complete' ? 'Breathe again' : running ? 'Pause breathing' : 'Resume breathing'}
          </button>
        </div>
        <div className="reset-journey__bottom">
          {search && <div className="reset-next">
            {next.spot && <span>{next.kind === 'safety' ? 'Safety first' : 'Next spot'}</span>}
            <strong>{next.spot ?? next.title}</strong>
            {next.kind === 'safety' && <p>{next.instruction}</p>}
          </div>}
          <button className="button button--primary reset-journey__action" onClick={onResume}>{search ? 'Back to search' : 'Back to home'}</button>
        </div>
      </div>
    </section>
  )
}
