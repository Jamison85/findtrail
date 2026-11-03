import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { ActiveSearch, Screen, Settings } from '../types'
import { Icon } from './Icon'
import { clearNextStep } from './clearNextStep'

type Stage = 'start' | 'quieting' | 'focusing' | 'ready'
const MOMENTS: { at: number; stage: Stage }[] = [
  { at: 1350, stage: 'quieting' },
  { at: 3500, stage: 'focusing' },
  { at: 5800, stage: 'ready' },
]
const END = MOMENTS[MOMENTS.length - 1].at

function useReducedMotion(motion: Settings['motion']) {
  const [system, setSystem] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!query) return
    const update = () => setSystem(query.matches)
    query.addEventListener?.('change', update)
    return () => query.removeEventListener?.('change', update)
  }, [])
  return motion === 'reduced' || (motion === 'system' && system)
}

interface CalmResetProps {
  search: ActiveSearch | null
  returnScreen: Screen
  motion: Settings['motion']
  onResume: () => void
}

/**
 * CLEAR is a temporary visual reset, not another search engine.
 * It never advances a stop or modifies a search. The parent owns returning to
 * the exact same place and restoring the search heading's keyboard focus.
 */
export function CalmReset({ search, returnScreen, motion, onResume }: CalmResetProps) {
  const reduced = useReducedMotion(motion)
  const [stage, setStage] = useState<Stage>(reduced ? 'ready' : 'start')
  const [run, setRun] = useState(0)
  const [breathing, setBreathing] = useState(false)
  const view = useRef<HTMLElement>(null)
  const cta = useRef<HTMLButtonElement>(null)
  const openingHeading = useRef<HTMLHeadingElement>(null)
  const payoffHeading = useRef<HTMLHeadingElement>(null)
  const stageRef = useRef<Stage>(stage)
  const elapsed = useRef(0)
  const runningSince = useRef<number | null>(null)
  const timer = useRef<number | null>(null)
  const pausedAnimations = useRef<Animation[]>([])
  const next = clearNextStep(search, returnScreen)
  const ready = stage === 'ready'

  // Do not leave keyboard focus inside a headline that becomes aria-hidden.
  // Move focus only if it is still on that headline, never away from a control
  // the person is actively using.
  useEffect(() => {
    if (ready && document.activeElement === openingHeading.current) {
      payoffHeading.current?.focus({ preventScroll: true })
    }
  }, [ready])

  function stopTimer() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }

  function reveal(manual = false) {
    stopTimer()
    elapsed.current = END
    runningSince.current = null
    stageRef.current = 'ready'
    setStage('ready')
    // On a voluntary skip, move focus to the action the user requested.
    // Automatic progression announces the action instead of stealing focus.
    if (manual) window.requestAnimationFrame(() => cta.current?.focus({ preventScroll: true }))
  }

  useEffect(() => {
    if (reduced) {
      stageRef.current = 'ready'
      setStage('ready')
      return
    }
    let disposed = false
    elapsed.current = 0
    runningSince.current = null
    stageRef.current = 'start'
    setStage('start')

    const getElapsed = () => elapsed.current +
      (runningSince.current === null ? 0 : Math.max(0, performance.now() - runningSince.current))

    const schedule = () => {
      stopTimer()
      if (disposed || document.hidden || stageRef.current === 'ready') return
      if (runningSince.current === null) runningSince.current = performance.now()
      const now = getElapsed()
      const upcoming = MOMENTS.find((event) => event.at > now + 1)
      if (!upcoming) {
        stageRef.current = 'ready'
        setStage('ready')
        return
      }
      timer.current = window.setTimeout(() => {
        if (disposed) return
        const current = getElapsed()
        const reached = [...MOMENTS].reverse().find((event) => current >= event.at - 2)
        if (reached) {
          stageRef.current = reached.stage
          setStage(reached.stage)
        }
        if (stageRef.current !== 'ready') schedule()
      }, Math.max(16, Math.ceil(upcoming.at - now)))
    }

    const visibility = () => {
      if (document.hidden) {
        if (runningSince.current !== null) {
          elapsed.current = getElapsed()
          runningSince.current = null
        }
        stopTimer()
        pausedAnimations.current = view.current?.getAnimations?.({ subtree: true })
          .filter((animation) => animation.playState === 'running') ?? []
        pausedAnimations.current.forEach((animation) => animation.pause())
      } else {
        pausedAnimations.current.forEach((animation) => { if (animation.playState === 'paused') animation.play() })
        pausedAnimations.current = []
        schedule()
      }
    }
    document.addEventListener('visibilitychange', visibility)
    schedule()
    return () => {
      disposed = true
      stopTimer()
      runningSince.current = null
      document.removeEventListener('visibilitychange', visibility)
      pausedAnimations.current.forEach((animation) => { if (animation.playState === 'paused') animation.play() })
      pausedAnimations.current = []
    }
  }, [reduced, run])

  function replay() {
    setBreathing(false)
    setRun((current) => current + 1)
  }

  const status = ready
    ? (next.spot ? `Your next useful step is ${next.spot}. ${next.instruction}` : `${next.title} ${next.instruction}`)
    : ''

  return (
    <section
      ref={view}
      className={`view clear-view ${stage === 'start' ? '' : 'clear-quieting'} ${stage === 'focusing' || ready ? 'clear-focusing' : ''} ${ready ? 'clear-ready' : ''} ${reduced ? 'clear-reduced' : ''}`}
      aria-labelledby="view-heading"
      style={{ '--clear-photo': `url("${import.meta.env.BASE_URL}clear-dawn.webp")` } as CSSProperties}
    >
      <div className="clear-world" aria-hidden="true">
        <div className="clear-scene" />
        <div className="clear-atmosphere" />
        <div className="clear-dim" />
        <div className="clear-lens" />
        <div className="clear-bottom-shade" />
        <div className="clear-attention-veil" />
        <div className="clear-horizon-quiet" />
      </div>

      <div className="clear-inner">
        <header className="clear-topbar">
          <div className="clear-brand"><svg className="clear-mark" viewBox="0 0 36 44" fill="none" aria-hidden="true"><path d="M18 40S32 25.5 32 17.2a14 14 0 0 0-28 0C4 25.5 18 40 18 40Z" stroke="#FF9783" strokeWidth="2.8" /><circle cx="18" cy="17" r="5.5" fill="#FF9783" /></svg><strong>FindTrail</strong><span>CLEAR</span></div>
          <button className="clear-exit" type="button" onClick={onResume} aria-label="Continue search without changing progress">Continue search <Icon name="forward" size={15} /></button>
        </header>

        <div className="clear-hero">
          <div className="clear-message clear-before" aria-hidden={ready}>
            <h1 ref={openingHeading} id={!ready ? 'view-heading' : undefined} aria-label="You haven't lost your place." tabIndex={-1}>You haven't<br />lost your place.</h1>
            <p>Your search is still here. Take just this moment.</p>
          </div>
          <div className="clear-message clear-after" aria-hidden={!ready}>
            <span className="clear-eyebrow">THE NEXT USEFUL THING</span>
            <h2 ref={payoffHeading} id={ready ? 'view-heading' : undefined} tabIndex={-1} aria-label="One place. One useful step.">One place.<br />One useful step.</h2>
            <p>Your trail is still right where you left it.</p>
          </div>
          {!ready && <button className="clear-advance" type="button" onClick={() => reveal(true)}>I'm ready for one step <Icon name="forward" size={15} /></button>}
        </div>

        <div className="clear-spacer" aria-hidden="true" />
        <div className="clear-bottom">
          <div className="clear-spot-space">
            <article className="clear-spot-card" aria-hidden={!ready} aria-label="Your next useful search action">
              <div className="clear-spot-meta"><span>{next.label}</span><span>{next.itemLabel ?? 'FINDTRAIL'}</span></div>
              <h3 className="clear-spot-title">{next.title}</h3>
              <p className="clear-spot-copy">{next.instruction}</p>
              {next.spot && (
                <div className="clear-place">
                  <span className="clear-place-kicker">{next.kind === 'safety' ? 'NEXT SAFETY STEP' : 'NEXT UNCHECKED SPOT'}</span>
                  <span className="clear-place-main"><Icon name="pin" size={22} />{next.spot}</span>
                </div>
              )}
            </article>
          </div>
          <div className="clear-action-space">
            {ready && <button ref={cta} className="clear-action" type="button" onClick={onResume}>{next.buttonLabel}<Icon name="forward" size={22} /></button>}
          </div>
          <footer className="clear-foot">
            <button className="clear-micro" type="button" aria-expanded={breathing} onClick={() => setBreathing((value) => !value)}>{breathing ? 'Hide breathing cue' : 'Optional breathing cue'}</button>
            {ready && !reduced && <button className="clear-micro clear-replay" type="button" onClick={replay}>Replay</button>}
            {breathing && <p className="clear-breathe">Breathe gently in. Breathe comfortably out. There is no pace to keep.</p>}
          </footer>
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">{status}</span>
    </section>
  )
}
