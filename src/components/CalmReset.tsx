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
      ? `${Math.max(1, Math.ceil(4 - withinCycle))}s`
      : `${Math.max(1, Math.ceil(10 - withinCycle))}s`

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
        <span className="eyebrow eyebrow--light"><Icon name="calm" size={17} /> 30-second reset</span>
        <button className="calm-skip" onClick={onResume}>Skip <Icon name="close" size={15} /></button>
      </header>
      <div className="calm-view__content">
        <div className="calm-copy">
          <h1 id="view-heading" tabIndex={-1}>Let the search get quiet <em>for thirty seconds.</em></h1>
          <p>Follow the feather. Breathe in as it rises, then breathe out as it settles toward the water.</p>
        </div>
        <div key={`scene-${run}`} className={reducedMotion ? 'calm-scene is-reduced-motion' : 'calm-scene'}>
          <div className="calm-scene__horizon" aria-hidden="true" />
          <svg className="calm-feather" viewBox="0 0 80 220" aria-hidden="true">
            <defs>
              <linearGradient id="feather-barb" x1="16" y1="18" x2="67" y2="200" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fff8e9" /><stop offset=".5" stopColor="#ded4bd" /><stop offset="1" stopColor="#b7aa8d" />
              </linearGradient>
              <linearGradient id="feather-shaft" x1="43" y1="12" x2="37" y2="214" gradientUnits="userSpaceOnUse">
                <stop stopColor="#fff9eb" /><stop offset=".7" stopColor="#d5c4a1" /><stop offset="1" stopColor="#a8997a" />
              </linearGradient>
            </defs>
            <g fill="none" stroke="url(#feather-barb)" strokeLinecap="round">
              <path d="M42 21 29 34M42 23 54 35M41 31 24 47M42 33 59 49M41 41 19 60M42 43 64 62M40 51 16 72M42 54 67 75M40 62 14 84M42 65 69 87M40 73 13 96M42 76 70 99M40 84 14 108M42 87 69 111M40 96 16 120M42 99 67 123M39 108 18 132M41 111 65 135M39 120 20 144M41 123 63 147M39 132 23 156M41 135 60 159M39 144 26 168M41 147 57 171M39 156 29 180M40 159 54 183M39 168 32 191M40 171 51 194" strokeWidth="1.35" />
              <path d="M39 45 27 55M44 58 56 68M37 81 25 90M45 103 58 113M36 128 26 136M44 151 55 160" strokeWidth=".7" opacity=".48" />
            </g>
            <path d="M42 18C39 63 38 112 39 160C39 184 39 202 37 216" stroke="#4e5f58" strokeOpacity=".28" strokeWidth="4.8" strokeLinecap="round" />
            <path d="M42 18C39 63 38 112 39 160C39 184 39 202 37 216" stroke="url(#feather-shaft)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M41.5 18C39 64 38.5 111 39.4 159" stroke="#fffdf5" strokeOpacity=".56" strokeWidth=".55" strokeLinecap="round" />
          </svg>
          <span className="feather-ripple feather-ripple--one" aria-hidden="true" />
          <span className="feather-ripple feather-ripple--two" aria-hidden="true" />
          <span className="feather-ripple feather-ripple--three" aria-hidden="true" />
          <div className="calm-scene__readout" aria-live="polite">
            <strong>{phase}</strong>
            <span>{complete ? 'You gave your attention room to reset.' : `${phaseSeconds} · breath ${cycle} of 3`}</span>
          </div>
        </div>
      </div>
      <footer className="calm-dock">
        <div className="calm-dock__readout">
          <div className="calm-dock__phase">
            <span className={complete ? 'calm-dock__pulse is-complete' : `calm-dock__pulse is-${phase === 'Breathe in' ? 'in' : 'out'}`} aria-hidden="true" />
            <div><small>{complete ? 'Reset complete' : `Breath ${cycle} of 3`}</small><strong>{complete ? 'Ready when you are' : phase}</strong></div>
            <b>{complete ? '30s' : `${seconds}s`}</b>
          </div>
          <div className="calm-dock__progress" role="progressbar" aria-label="Mental reset progress" aria-valuemin={0} aria-valuemax={TOTAL_SECONDS} aria-valuenow={Math.round(elapsed)}>
            <span style={{ width: `${Math.min(100, (elapsed / TOTAL_SECONDS) * 100)}%` }} />
          </div>
          <div className="calm-dock__rhythm" aria-label="Breathing rhythm: four seconds in, six seconds out">
            <span className={!complete && phase === 'Breathe in' ? 'is-active' : ''}><b>4</b> in</span><i aria-hidden="true" /><span className={!complete && phase === 'Breathe out' ? 'is-active' : ''}><b>6</b> out</span>
          </div>
        </div>
        <div className="calm-dock__actions">
          <button className="calm-restart" onClick={restart}><Icon name="refresh" size={15} /> Restart</button>
          <button className="calm-resume" onClick={onResume}>
            <span><small>{hasSearch ? 'Return to the search' : 'Return home'}</small><strong>Resume with clear eyes</strong></span>
            <i aria-hidden="true"><Icon name="forward" size={18} /></i>
          </button>
        </div>
      </footer>
    </section>
  )
}
