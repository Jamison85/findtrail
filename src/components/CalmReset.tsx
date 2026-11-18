import { useEffect, useRef, useState } from 'react'
import type { ActiveSearch, Screen, Settings } from '../types'
import { BrandMark } from './BrandMark'
import { Icon } from './Icon'
import { clearNextStep } from './clearNextStep'

const REVEAL_MS = 4200

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
  onBegin: () => void
}

export function CalmReset({ search, returnScreen, motion, onResume, onBegin }: CalmResetProps) {
  const reduced = useReducedMotion(motion)
  const [ready, setReady] = useState(reduced)
  const [breathing, setBreathing] = useState(false)
  const [paused, setPaused] = useState(false)
  const remaining = useRef(REVEAL_MS)
  const started = useRef(0)
  const timer = useRef<number | null>(null)
  const openingHeading = useRef<HTMLHeadingElement>(null)
  const readyHeading = useRef<HTMLHeadingElement>(null)
  const action = useRef<HTMLButtonElement>(null)
  const next = clearNextStep(search, returnScreen)

  useEffect(() => {
    if (reduced) setReady(true)
  }, [reduced])

  useEffect(() => {
    if (ready || paused || reduced) return
    started.current = performance.now()
    timer.current = window.setTimeout(() => setReady(true), remaining.current)
    return () => { if (timer.current !== null) window.clearTimeout(timer.current) }
  }, [ready, paused, reduced])

  useEffect(() => {
    const visibility = () => {
      if (document.hidden && !ready && !paused) {
        remaining.current = Math.max(0, remaining.current - (performance.now() - started.current))
        setPaused(true)
      }
      if (!document.hidden && paused && !ready) setPaused(false)
    }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [ready, paused])

  useEffect(() => {
    if (ready && document.activeElement === openingHeading.current) readyHeading.current?.focus({ preventScroll: true })
  }, [ready])

  function reveal() {
    setReady(true)
    window.requestAnimationFrame(() => action.current?.focus({ preventScroll: true }))
  }

  return (
    <section className={`view reset-journey${ready ? ' is-ready' : ''}${reduced ? ' is-reduced' : ''}`} aria-labelledby="view-heading">
      <div className="reset-journey__scene" aria-hidden="true" />
      <div className="reset-journey__layout">
        <header className="reset-journey__top">
          <div className="reset-journey__brand"><BrandMark /> <strong>FindTrail</strong><span>Reset</span></div>
          <button className="reset-journey__exit" onClick={onResume}>{search ? 'Back to search' : 'Back to home'} <Icon name="close" size={15} /></button>
        </header>
        <div className="reset-journey__message">
          {!ready ? <>
            <span className="eyebrow">A moment to reset</span>
            <h1 ref={openingHeading} id="view-heading" tabIndex={-1}>You haven’t lost your place.</h1>
            <p>Your search is saved. Let the noise settle for a moment.</p>
            <button className="reset-journey__skip" onClick={reveal}>{paused ? 'Show my next step' : 'I’m ready for one step'} <Icon name="forward" size={17} /></button>
          </> : <>
            <span className="eyebrow">The next useful thing</span>
            <h1 ref={readyHeading} id="view-heading" tabIndex={-1}>One place. One step.</h1>
            <p>{search ? 'Your trail is right where you left it.' : 'Start with one missing item.'}</p>
          </>}
        </div>
        <div className="reset-journey__bottom">
          {ready && <article className="reset-next" aria-label="Your next step">
            <span className="reset-next__label">{next.label} {next.itemLabel && <small>· {next.itemLabel}</small>}</span>
            <h2>{next.title}</h2>
            <p>{next.instruction}</p>
            {next.spot && <div className="reset-next__spot"><Icon name="pin" size={19} /><span><small>{next.kind === 'safety' ? 'Next safety step' : 'Next unchecked spot'}</small><strong>{next.spot}</strong></span></div>}
          </article>}
          {ready && <button ref={action} className="button button--primary reset-journey__action" onClick={next.kind === 'new' ? onBegin : onResume}>{next.buttonLabel}<Icon name="forward" size={20} /></button>}
          <button className="reset-journey__breathing" aria-expanded={breathing} onClick={() => setBreathing((open) => !open)}>{breathing ? 'Hide breathing cue' : 'Optional breathing cue'}</button>
          {breathing && <p className="reset-journey__breath-copy">Breathe gently in. Breathe comfortably out. There is no pace to keep.</p>}
        </div>
      </div>
      <span className="sr-only" role="status" aria-live="polite">{ready ? `Your next step: ${next.spot ?? next.title}.` : paused ? 'Reset paused. Your place is saved.' : ''}</span>
    </section>
  )
}
