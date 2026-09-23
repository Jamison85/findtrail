import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { HorizonRipples } from './HorizonRipples'
import { Icon } from './Icon'
import { FeatherMark } from './FeatherMark'

const RESET_FEATHER = `${import.meta.env.BASE_URL}findtrail-natural-feather-v2.webp`
const TOTAL_SECONDS = 30
const CYCLE_SECONDS = 10

type ResetPhase = 'Breathe in' | 'Breathe out'

function useReducedMotion(motion: Settings['motion']) {
  const [systemReduced, setSystemReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!media) return
    const update = () => setSystemReduced(media.matches)
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [])

  return motion === 'reduced' || (motion === 'system' && systemReduced)
}

function phaseFor(elapsed: number): ResetPhase {
  return (elapsed % CYCLE_SECONDS) < 4 ? 'Breathe in' : 'Breathe out'
}

export function CalmReset({ onResume, hasSearch, motion }: { onResume: () => void; hasSearch: boolean; motion: Settings['motion'] }) {
  const [elapsed, setElapsed] = useState(0)
  const reducedMotion = useReducedMotion(motion)
  const timerRef = useRef<number | null>(null)

  const remaining = Math.max(0, Math.ceil(TOTAL_SECONDS - elapsed))
  const complete = remaining === 0
  const withinCycle = elapsed % CYCLE_SECONDS
  const phase = complete ? 'Reset complete' : phaseFor(elapsed)
  const phaseSeconds = complete
    ? 0
    : withinCycle < 4
      ? Math.max(1, Math.ceil(4 - withinCycle))
      : Math.max(1, Math.ceil(CYCLE_SECONDS - withinCycle))
  const guidance = complete
    ? 'Notice what feels quieter now.'
    : phase === 'Breathe in'
      ? 'Rise with the feather'
      : 'Drift down with it'

  useEffect(() => {
    const startedAt = performance.now()
    setElapsed(0)

    timerRef.current = window.setInterval(() => {
      const next = Math.min(TOTAL_SECONDS, (performance.now() - startedAt) / 1000)
      setElapsed(next)
      if (next >= TOTAL_SECONDS && timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }, 100)

    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, []

  return (
    <section className="view calm-view" aria-labelledby="view-heading">
      <HorizonRipples reducedMotion={reducedMotion} restartKey={0} />
      <div className="calm-view__veil" aria-hidden="true" />

      <header className="calm-topbar">
        <strong className="calm-brand">FindTrail</strong>
        <button className="calm-skip" onClick={onResume} aria-label="Skip">
          Skip <Icon name="close" size={14} />
        </button>
      </header>

      <div className="calm-view__content">
        <div className="calm-copy">
          <span className="calm-reset-label"><FeatherMark className="calm-reset-label__feather" /> 30-second reset</span>
          <h1 id="view-heading" tabIndex={-1}>The search can wait one breath.</h1>
          <p>Attention gets noisy when the search gets frantic. Let the horizon widen your awareness.</p>
        </div>

        <div className="calm-breath-stage">
          <div className={complete ? 'calm-guidance is-complete' : 'calm-guidance'} aria-hidden="true">
            <strong className="calm-guidance__phase">{complete ? 'Reset complete' : phase}</strong>
            <span className="calm-guidance__count">
              <b>{complete ? '✓' : phaseSeconds}</b>
              {!complete && <small>seconds</small>}
            </span>
            <span className="calm-guidance__hint">{guidance}</span>
          </div>
        </div>
      </div>

      <div className={reducedMotion ? 'calm-flight is-reduced-motion' : 'calm-flight'} aria-hidden="true">
        <div className="calm-feather-anchor">
          <div className="calm-feather-drift">
            <img className="calm-feather" src={RESET_FEATHER} alt="" draggable="false" />
          </div>
        </div>
      </div>

      <footer className="calm-instrument">
        <div className="calm-breath-card">
          <span className="sr-only" aria-live="polite">{phase}</span>
          <div className="calm-progress" role="progressbar" aria-label="Mental reset progress" aria-valuemin={0} aria-valuemax={TOTAL_SECONDS} aria-valuenow={Math.round(elapsed)}>
            <span style={{ width: `${Math.min(100, (elapsed / TOTAL_SECONDS) * 100)}%` }} />
          </div>
        </div>

        <button className="calm-resume" onClick={onResume}>
          <span>Resume with clear eyes</span>
          <i aria-hidden="true"><Icon name="forward" size={18} /></i>
        </button>

        <span className="sr-only">{hasSearch ? 'This returns to your active search.' : 'This returns to the home screen.'}</span>
      </footer>
    </section>
  )
}
