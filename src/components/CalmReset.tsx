import { useEffect, useRef, useState } from 'react'
import type { ActiveSearch, Screen } from '../types'
import { Icon } from './Icon'
import { clearNextStep } from './clearNextStep'
import { GUIDED_EXHALE_SECONDS, RESET_CYCLES, RIPPLE_TAIL_SECONDS } from './resetTiming'
import { createBreathingLake } from './breathingLake'
import { createLakeDepth } from './lakeDepth'
import { createCoveWind } from './coveWind'
import { createCoveClouds } from './coveClouds'

interface CalmResetProps {
  search: ActiveSearch | null
  returnScreen: Screen
  reducedMotion?: boolean
  onClose?: () => void
  onResume: () => void
  onHome: () => void
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
const EXHALE_START = BREATHE_IN_SECONDS + HOLD_SECONDS
const CYCLE_SECONDS = EXHALE_START + GUIDED_EXHALE_SECONDS
const TOTAL_SECONDS = CYCLE_SECONDS * RESET_CYCLES
const LAKE_IMAGE = `${import.meta.env.BASE_URL}findtrail-lake-cove.webp`
const LAKE_WATERLINE = .493
type BreathStep = { phase: keyof typeof phaseLabels; breath: number }
type ResetScene = ReturnType<typeof createBreathingLake> & { drawClouds: (position: number) => void }

export function CalmReset({ search, returnScreen, reducedMotion = false, onResume, onClose = onResume, onHome }: CalmResetProps) {
  const [{ phase, breath }, setBreathStep] = useState<BreathStep>({ phase: 'idle', breath: 1 })
  const [running, setRunning] = useState(false)
  const [replay, setReplay] = useState(0)
  const lake = useRef<HTMLImageElement>(null)
  const sky = useRef<HTMLCanvasElement>(null)
  const breeze = useRef<HTMLCanvasElement>(null)
  const leafLayer = useRef<HTMLCanvasElement>(null)
  const water = useRef<HTMLCanvasElement>(null)
  const depth = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ResetScene>(null)
  const elapsed = useRef(0)
  const completedBreaths = useRef(0)
  const next = clearNextStep(search, returnScreen)

  useEffect(() => {
    if (reducedMotion || !lake.current || !sky.current || !breeze.current || !leafLayer.current || !water.current || !depth.current) return
    const photo = lake.current
    const fallbackLayer = water.current
    const depthLayer = depth.current
    const clouds = createCoveClouds(photo, sky.current)
    const wind = createCoveWind(photo, breeze.current, leafLayer.current)
    let renderer: ReturnType<typeof createLakeDepth> = null
    let fallback: ReturnType<typeof createBreathingLake> | undefined
    let initialized = false
    const effect: ResetScene = {
      drawClouds: clouds.draw,
      draw(motion, progress, waveTime, seconds) {
        wind.draw(motion === 'exhale' ? waveTime : undefined)
        if (motion && !initialized) {
          renderer = createLakeDepth(photo, depthLayer, LAKE_WATERLINE)
          initialized = true
        }
        if (renderer?.available()) renderer.draw(motion, progress, waveTime, seconds)
        else if (motion) {
          fallback ??= createBreathingLake(photo, fallbackLayer)
          fallback.draw(motion, progress, waveTime, seconds)
        } else fallback?.draw(null)
      },
      dispose() {
        clouds.dispose()
        wind.dispose()
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
    let lastStep: BreathStep | undefined

    function draw(now: number) {
      const end = TOTAL_SECONDS + (reducedMotion ? 0 : RIPPLE_TAIL_SECONDS)
      const seconds = Math.max(0, Math.min(end, (now - startedAt) / 1000))
      elapsed.current = seconds
      const cycle = seconds % CYCLE_SECONDS
      const finished = seconds >= TOTAL_SECONDS
      const nextPhase = finished ? 'complete' : cycle < BREATHE_IN_SECONDS ? 'inhale' : cycle < EXHALE_START ? 'hold' : 'exhale'
      const nextBreath = Math.min(RESET_CYCLES, Math.floor(seconds / CYCLE_SECONDS) + 1)
      if (nextPhase !== lastStep?.phase || nextBreath !== lastStep.breath) {
        lastStep = { phase: nextPhase, breath: nextBreath }
        setBreathStep(lastStep)
      }

      const previousWave = seconds >= CYCLE_SECONDS && cycle < RIPPLE_TAIL_SECONDS ? GUIDED_EXHALE_SECONDS + cycle : undefined
      const inhaled = Math.min(1, cycle / BREATHE_IN_SECONDS)
      const cloudPosition = finished ? RESET_CYCLES : nextBreath - 1 + inhaled * inhaled * (3 - 2 * inhaled)
      scene.current?.drawClouds(completedBreaths.current + cloudPosition)
      if (reducedMotion || seconds >= end) scene.current?.draw(null)
      else if (finished) scene.current?.draw('tail', (seconds - TOTAL_SECONDS) / RIPPLE_TAIL_SECONDS, GUIDED_EXHALE_SECONDS + seconds - TOTAL_SECONDS, seconds)
      else if (nextPhase === 'inhale') scene.current?.draw('inhale', cycle / BREATHE_IN_SECONDS, previousWave, seconds)
      else if (nextPhase === 'hold') scene.current?.draw('hold', 0, -1, seconds)
      else scene.current?.draw('exhale', (cycle - EXHALE_START) / GUIDED_EXHALE_SECONDS, cycle - EXHALE_START, seconds)
      if (seconds >= end) setRunning(false)
      else frame = requestAnimationFrame(draw)
    }

    function pauseWhenHidden() {
      if (!document.hidden) return
      if (elapsed.current >= TOTAL_SECONDS) scene.current?.draw(null)
      setRunning(false)
    }

    frame = requestAnimationFrame(draw)
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('visibilitychange', pauseWhenHidden)
    }
  }, [reducedMotion, running, replay])

  function toggleBreathing() {
    if (running && phase !== 'complete') {
      setRunning(false)
      return
    }
    if (phase === 'idle' || phase === 'complete') {
      if (phase === 'complete') completedBreaths.current += RESET_CYCLES
      elapsed.current = 0
      setBreathStep({ phase: 'inhale', breath: 1 })
      if (running) setReplay((value) => value + 1)
    }
    setRunning(true)
  }

  const paused = !running && phase !== 'idle' && phase !== 'complete'
  const cue = reducedMotion && phase === 'idle' ? 'Follow your breath' : phaseLabels[phase]
  const hint = phase === 'idle' ? `${RESET_CYCLES} slow breaths.`
    : phase === 'complete' ? (next.spot && next.kind !== 'safety' ? 'One spot at a time.' : '')
    : `Breath ${breath} of ${RESET_CYCLES}`

  return (
    <section className="view reset-journey" aria-labelledby="view-heading">
      <div className="reset-journey__scene" aria-hidden="true">
        <img ref={lake} className="reset-journey__lake" src={LAKE_IMAGE} alt="" />
        <canvas ref={sky} className="reset-journey__clouds" />
        <canvas ref={breeze} className="reset-journey__wind reset-journey__wind--scene" />
        <canvas ref={depth} className="reset-journey__water reset-journey__water--depth" />
        <canvas ref={water} className="reset-journey__water reset-journey__water--fallback" />
        <canvas ref={leafLayer} className="reset-journey__wind reset-journey__wind--leaves" />
      </div>
      <div className="reset-journey__layout">
        <header className="reset-journey__top">
          <strong>Reset</strong>
          <button className="icon-button reset-journey__exit" onClick={onClose} aria-label="Close reset"><Icon name="close" size={21} /></button>
        </header>
        <div className="reset-journey__message">
          <h1 id="view-heading" tabIndex={-1}>Take a moment.</h1>
          {search && <p>Your search is saved.</p>}
        </div>
        <div className="reset-breathing" data-phase={phase}>
          <div role="status">
            <p className="reset-breathing__phase">{paused ? 'Breathing paused' : cue}</p>
            <p className="reset-breathing__hint">{hint}</p>
          </div>
          <button className="reset-breathing__control" onClick={toggleBreathing}>
            {phase === 'idle' ? 'Start breathing' : phase === 'complete' ? 'Breathe again' : running ? 'Pause breathing' : 'Resume breathing'}
          </button>
        </div>
        <div className="reset-journey__bottom">
          {phase === 'complete' && next.spot && <div className="reset-next">
            <span>{next.kind === 'safety' ? 'Safety first' : 'Start here'}</span>
            <strong>{next.spot}</strong>
            {next.kind === 'safety' && <p>{next.instruction}</p>}
          </div>}
          {search && <button className={`button ${phase === 'complete' ? 'button--primary' : 'button--secondary'} reset-journey__action`} onClick={onResume}>{returnScreen === 'trail' ? 'Continue trail' : 'Continue search'}</button>}
          <button className={search ? 'text-button reset-journey__home' : `button ${phase === 'complete' ? 'button--primary' : 'button--secondary'} reset-journey__action`} onClick={onHome}>Back to home</button>
        </div>
      </div>
    </section>
  )
}
