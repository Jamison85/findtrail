import { useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { HorizonRipples } from './HorizonRipples'
import { Icon } from './Icon'

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

  const seconds = Math.max(0, Math.ceil(TOTAL_SECONDS - elapsed))
  const complete = seconds === 0
  const cycle = Math.min(3, Math.floor(elapsed / CYCLE_SECONDS) + 1)
  const phase = complete ? 'Reset complete' : phaseFor(elapsed)
  const withinCycle = elapsed % CYCLE_SECONDS
  const phaseSeconds = complete
    ? ''
    : withinCycle < 4
      ? Math.max(1, Math.ceil(4 - withinCycle))
      : Math.max(1, Math.ceil(10 - withinCycle))

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
        <div className="calm-brand-block">
          <strong className="calm-brand">FindTrail</strong>
          <span className="calm-reset-label"><Icon name="calm" size={14} /> 30-second reset</span>
        </div>
        <button className="calm-skip" onClick={onResume}>Skip <Icon name="close" size={14} /></button>
      </header>

      <div className="calm-view__content">
        <div className="calm-copy">
          <h1 id="view-heading" tabIndex={-1}>The search can wait <em>one breath.</em></h1>
          <p>Attention gets noisy when the search gets frantic. Let the light widen your awareness.</p>
        </div>

        <div key={`flight-${run}`} className={reducedMotion ? 'calm-flight is-reduced-motion' : 'calm-flight'} aria-hidden="true">
          <img
            className="calm-feather"
            src={`${import.meta.env.BASE_URL}findtrail-natural-feather-v2.webp`}
            alt=""
          />
          <span className="feather-ripple feather-ripple--one" />
          <span className="feather-ripple feather-ripple--two" />
          <span className="feather-ripple feather-ripple--three" />
        </div>
      </div>

      <footer className="calm-instrument">
        <div className="calm-instrument__status">
          <div className="calm-phase-copy" aria-live="polite">
            <small>{complete ? 'Three breaths complete' : `${phase === 'Breathe in' ? 'Inhale' : 'Exhale'} · ${phaseSeconds} ${phaseSeconds === 1 ? 'second' : 'seconds'}`}</small>
            <strong>{complete ? 'Ready when you are' : phase}</strong>
          </div>

          <div className="calm-cycle-markers" aria-label={complete ? 'Three of three breaths complete' : `Breath ${cycle} of 3`}>
            {[1, 2, 3].map((marker) => (
              <span key={marker} className={marker < cycle || complete ? 'is-complete' : marker === cycle ? 'is-current' : ''} />
            ))}
          </div>

          <span className="calm-brass-divider" aria-hidden="true" />
          <div className="calm-countdown"><b>{seconds}</b><small>sec</small></div>
        </div>

        <div className="calm-progress" role="progressbar" aria-label="Mental reset progress" aria-valuemin={0} aria-valuemax={TOTAL_SECONDS} aria-valuenow={Math.round(elapsed)}>
          <span style={{ width: `${Math.min(100, (elapsed / TOTAL_SECONDS) * 100)}%` }} />
        </div>

        <div className="calm-instrument__guidance">
          <span><b>4</b> in</span>
          <i aria-hidden="true" />
          <span><b>6</b> out</span>
          <small>Breathe normally if this rhythm feels uncomfortable.</small>
        </div>

        <div className="calm-instrument__actions">
          <button className="calm-restart" onClick={restart}><Icon name="refresh" size={15} /> Restart</button>
          <button className="calm-resume" onClick={onResume}>
            <span>
              <small>{hasSearch ? 'Return to the search' : 'Return home'}</small>
              <strong>Resume with clear eyes</strong>
            </span>
            <i aria-hidden="true"><Icon name="forward" size={18} /></i>
          </button>
        </div>
      </footer>
    </section>
  )
}
