import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { HorizonRipples } from './HorizonRipples'
import { Icon } from './Icon'

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
  const [run, setRun] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const reducedMotion = useReducedMotion(motion)
  const timerRef = useRef<number | null>(null)

  const remaining = Math.max(0, Math.ceil(TOTAL_SECONDS - elapsed))
  const complete = remaining === 0
  const cycle = complete ? 3 : Math.min(3, Math.floor(elapsed / CYCLE_SECONDS) + 1)
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
      ? 'Let the feather rise'
      : 'Let it drift back slowly'

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
  }, [run])

  function restart() {
    setRun((value) => value + 1)
  }

  return (
    <section className="view calm-view" aria-labelledby="view-heading">
      <HorizonRipples reducedMotion={reducedMotion} restartKey={run} />
      <div className="calm-view__veil" aria-hidden="true" />

      <header className="calm-topbar">
        <strong className="calm-brand">FindTrail</strong>
        <button className="calm-skip" onClick={onResume} aria-label="Skip">
          Skip <Icon name="close" size={14} />
        </button>
      </header>

      <div className="calm-view__content">
        <div className="calm-copy">
          <span className="calm-reset-label"><Icon name="calm" size={13} /> 30-second reset</span>
          <h1 id="view-heading" tabIndex={-1}>The search can wait one breath.</h1>
          <p>Attention gets noisy when the search gets frantic. Let the horizon widen your awareness.</p>
        </div>

        <div className="calm-breath-stage" aria-live="polite">
          <p className="calm-guidance">{guidance}</p>
        </div>
      </div>

      <div key={`flight-${run}`} className={reducedMotion ? 'calm-flight is-reduced-motion' : 'calm-flight'} aria-hidden="true">
        <div className="calm-feather-anchor">
          <div className="calm-feather-drift">
            <img className="calm-feather" src={RESET_FEATHER} alt="" draggable="false" />
          </div>
        </div>
      </div>

      <footer className="calm-instrument">
        <div className="calm-breath-card">
          <span className="sr-only" aria-live="polite">{phase}</span>
          <strong className="calm-rhythm-label">
            {complete ? 'Ready when you are' : `${phase === 'Breathe in' ? 'Inhale' : 'Exhale'} · ${phase === 'Breathe in' ? '4' : '6'} seconds`}
          </strong>

          <div className="calm-phase-count" aria-label={complete ? 'Reset complete' : `${phaseSeconds} seconds in this phase`}>
            <b>{complete ? '✓' : phaseSeconds}</b>
            {!complete && <small>sec</small>}
          </div>

          <div className="calm-progress" role="progressbar" aria-label="Mental reset progress" aria-valuemin={0} aria-valuemax={TOTAL_SECONDS} aria-valuenow={Math.round(elapsed)}>
            <span style={{ width: `${Math.min(100, (elapsed / TOTAL_SECONDS) * 100)}%` }} />
          </div>

          <div className="calm-cycle-meta">
            <div className="calm-cycle-markers" aria-label={complete ? 'Three of three breaths complete' : `Breath ${cycle} of 3`}>
              {[1, 2, 3].map((marker) => (
                <span key={marker} className={marker < cycle || complete ? 'is-complete' : marker === cycle ? 'is-current' : ''} />
              ))}
            </div>
            <span>{complete ? 'Three breaths complete' : `Cycle ${cycle} of 3 · ${remaining}s remaining`}</span>
          </div>
        </div>

        <button className="calm-resume" onClick={onResume}>
          <span>Resume with clear eyes</span>
          <i aria-hidden="true"><Icon name="forward" size={18} /></i>
        </button>

        <div className="calm-instrument__note">
          <span>Breathe comfortably. Never force the pace.</span>
          <button className="calm-restart" onClick={restart} aria-label="Restart the 30-second reset">
            <Icon name="refresh" size={13} /> Restart
          </button>
        </div>
        <span className="sr-only">{hasSearch ? 'This returns to your active search.' : 'This returns to the home screen.'}</span>
      </footer>
    </section>
  )
}
