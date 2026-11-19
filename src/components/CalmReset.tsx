import { useEffect, useRef, useState } from 'react'
import type { ActiveSearch, Screen } from '../types'
import { Icon } from './Icon'
import { clearNextStep } from './clearNextStep'
import { RESET_CYCLES } from './resetTiming'
import { createBreathingLake } from './breathingLake'
import { createLakeDepth } from './lakeDepth'

interface CalmResetProps {
  search: ActiveSearch | null
  returnScreen: Screen
  reducedMotion?: boolean
  onResume: () => void
}

const phaseLabels = {
  idle: 'Follow the water',
  inhale: 'Breathe in',
  hold: 'Hold gently',
  exhale: 'Breathe out',
  complete: 'Reset complete',
}

const BREATHE_IN_SECONDS = 6
const HOLD_SECONDS = 2
const BREATHE_OUT_SECONDS = 8
const EXHALE_START = BREATHE_IN_SECONDS + HOLD_SECONDS
const CYCLE_SECONDS = EXHALE_START + BREATHE_OUT_SECONDS
const TOTAL_SECONDS = CYCLE_SECONDS * RESET_CYCLES
const LAKE_IMAGE = `${import.meta.env.BASE_URL}findtrail-lake-cove.webp`
const LAKE_WATERLINE = .493
const phaseDetails = {
  idle: 'Watch the mist and the reflection.',
  inhale: 'Mist drifts toward you.',
  hold: '',
  exhale: 'Ripples move away from you.',
  complete: '',
}

export function CalmReset({ search, returnScreen, reducedMotion = false, onResume }: CalmResetProps) {
  const [phase, setPhase] = useState<keyof typeof phaseLabels>('idle')
  const [running, setRunning] = useState(false)
  const lake = useRef<HTMLImageElement>(null)
  const water = useRef<HTMLCanvasElement>(null)
  const depth = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ReturnType<typeof createBreathingLake>>(null)
  const elapsed = useRef(0)
  const next = clearNextStep(search, returnScreen)

  useEffect(() => {
    if (reducedMotion || !lake.current || !water.current || !depth.current) return
    const photo = lake.current
    const fallbackLayer = water.current
    const depthLayer = depth.current
    let renderer: ReturnType<typeof createLakeDepth> = null
    let fallback: ReturnType<typeof createBreathingLake> | undefined
    let initialized = false
    const effect: ReturnType<typeof createBreathingLake> = {
      draw(motion, progress) {
        if (motion && !initialized) {
          renderer = createLakeDepth(photo, depthLayer, LAKE_WATERLINE)
          initialized = true
        }
        if (renderer?.available()) renderer.draw(motion, progress)
        else if (motion) {
          fallback ??= createBreathingLake(photo, fallbackLayer)
          fallback.draw(motion, progress)
        } else fallback?.draw(null)
      },
      dispose() {
        renderer?.dispose()
        fallback?.dispose()
      },
    }
    scene.current = effect
    return () => {
      effect.dispose()
      scene.current = null
    }
  }, [reducedMotion])

  useEffect(() => {
    if (!running) return
    const startedAt = performance.now() - elapsed.current * 1000
    let frame = 0
    let lastPhase: keyof typeof phaseLabels | undefined

    function draw(now: number) {
      const seconds = Math.max(0, Math.min(TOTAL_SECONDS, (now - startedAt) / 1000))
      elapsed.current = seconds
      const cycle = seconds % CYCLE_SECONDS
      const finished = seconds >= TOTAL_SECONDS
      const nextPhase = finished ? 'complete' : cycle < BREATHE_IN_SECONDS ? 'inhale' : cycle < EXHALE_START ? 'hold' : 'exhale'
      if (nextPhase !== lastPhase) {
        lastPhase = nextPhase
        setPhase(nextPhase)
      }

      if (reducedMotion || finished) scene.current?.draw(null)
      else if (nextPhase === 'inhale') scene.current?.draw('inhale', cycle / BREATHE_IN_SECONDS)
      else if (nextPhase === 'hold') scene.current?.draw('hold')
      else scene.current?.draw('exhale', (cycle - EXHALE_START) / BREATHE_OUT_SECONDS)
      if (finished) setRunning(false)
      else frame = requestAnimationFrame(draw)
    }

    function pauseWhenHidden() {
      if (document.hidden) setRunning(false)
    }

    frame = requestAnimationFrame(draw)
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [reducedMotion, running])

  function toggleBreathing() {
    if (running) {
      setRunning(false)
      return
    }
    if (phase === 'idle' || phase === 'complete') {
      elapsed.current = 0
      setPhase('inhale')
    }
    setRunning(true)
  }

  const paused = !running && phase !== 'idle' && phase !== 'complete'
  const cue = reducedMotion && phase === 'idle' ? 'Follow your breath' : phaseLabels[phase]

  return (
    <section className="view reset-journey" aria-labelledby="view-heading">
      <div className="reset-journey__scene" aria-hidden="true">
        <img ref={lake} className="reset-journey__lake" src={LAKE_IMAGE} alt="" />
        <canvas ref={depth} className="reset-journey__water reset-journey__water--depth" />
        <canvas ref={water} className="reset-journey__water reset-journey__water--fallback" />
      </div>
      <div className="reset-journey__layout">
        <header className="reset-journey__top">
          <strong>Reset</strong>
          <button className="icon-button reset-journey__exit" onClick={onResume} aria-label="Close reset"><Icon name="close" size={21} /></button>
        </header>
        <div className="reset-journey__message">
          <h1 id="view-heading" tabIndex={-1}>Take a moment.</h1>
          {search && <p>Your search is saved.</p>}
        </div>
        <div className="reset-breathing">
          <p className="reset-breathing__phase" role="status">{paused ? 'Breathing paused' : cue}</p>
          <p className="reset-breathing__hint">{!paused && !reducedMotion && phaseDetails[phase]}</p>
          <button className="reset-breathing__control" onClick={toggleBreathing}>
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
