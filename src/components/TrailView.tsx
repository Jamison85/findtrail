import { useEffect, useMemo, useRef, useState } from 'react'
import { createRecognition, speak, stopSpeaking } from '../speech'
import { getTrailStage, isFocusedPassComplete, isWiderPassComplete } from '../trailEngine'
import type { ActiveSearch, Settings } from '../types'
import { Icon } from './Icon'
import { FeatherMark } from './FeatherMark'

interface TrailViewProps {
  search: ActiveSearch
  settings: Settings
  onBack: () => void
  onToggleSpot: (spot: string) => void
  onNext: () => void
  onFound: () => void
  onCalm: () => void
  onEditClues: () => void
}

export function TrailView({ search, settings, onBack, onToggleSpot, onNext, onFound, onCalm, onEditClues }: TrailViewProps) {
  const stop = search.stops[search.currentIndex]
  const checked = search.checkedSpots[stop.id] ?? []
  const totalChecked = Object.values(search.checkedSpots).reduce((total, spots) => total + spots.length, 0)
  const isLastStop = search.currentIndex === search.stops.length - 1
  const areaChecked = checked.length === stop.spots.length
  const [listening, setListening] = useState(false)
  const [heard, setHeard] = useState('')
  const [voiceError, setVoiceError] = useState('')
  const [voiceStatus, setVoiceStatus] = useState('')
  const [departing, setDeparting] = useState(false)
  const recognitionRef = useRef<ReturnType<typeof createRecognition>>(null)
  const advanceTimerRef = useRef<number | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const voiceSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
  const spokenText = useMemo(() => `${stop.title}. ${stop.instruction}. Check ${stop.spots.join(', ')}.`, [stop])
  const stage = getTrailStage(search.stops, search.currentIndex)
  const progress = (stage.current / stage.total) * 100
  const focusedPassComplete = isFocusedPassComplete(search.stops, search.currentIndex)
  const widerPassComplete = isWiderPassComplete(search.stops, search.currentIndex)
  const nextLabel = isLastStop
    ? 'Still missing · next steps'
    : focusedPassComplete
      ? 'Focused pass complete'
      : widerPassComplete
        ? 'Wider pass done · final sweep'
        : stage.name === 'safety'
          ? 'Safety step done · start search'
          : areaChecked
            ? 'Area checked · next place'
            : 'Nothing here · next place'
  const reduceMotion = settings.motion === 'reduced'
    || (settings.motion === 'system' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))

  function readCurrent() {
    setVoiceError('')
    setVoiceStatus('')
    const started = speak(spokenText, (status) => {
      if (status.state === 'preparing') {
        setVoiceStatus(status.progress ? `Preparing local voice · ${status.progress}%` : 'Preparing local voice…')
        return
      }
      if (status.state === 'speaking') {
        setVoiceStatus('Reading aloud…')
        return
      }
      if (status.state === 'idle') {
        setVoiceStatus('')
        return
      }
      setVoiceStatus('')
      setVoiceError(status.message)
    })
    if (!started) setVoiceError('Local Read aloud is not supported in this browser.')
  }

  useEffect(() => {
    setDeparting(false)
    setHeard('')
    setVoiceError('')
    setVoiceStatus('')
    if (settings.speakSteps) readCurrent()
    headingRef.current?.focus({ preventScroll: true })
    return stopSpeaking
    // Reading should happen only when the trail stop changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop.id, settings.speakSteps])

  useEffect(() => () => {
    recognitionRef.current?.stop()
    if (advanceTimerRef.current !== null) window.clearTimeout(advanceTimerRef.current)
  }, [])

  function advanceTrail() {
    if (departing || advanceTimerRef.current !== null) return
    recognitionRef.current?.stop()
    setListening(false)
    if (reduceMotion) {
      onNext()
      return
    }
    setDeparting(true)
    advanceTimerRef.current = window.setTimeout(() => {
      advanceTimerRef.current = null
      onNext()
    }, 190)
  }

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    setVoiceError('')
    const recognition = createRecognition((command) => {
      if (command === 'next') advanceTrail()
      if (command === 'found') onFound()
      if (command === 'repeat') readCurrent()
    }, (next) => {
      if (typeof next.listening === 'boolean') setListening(next.listening)
      if (typeof next.heard === 'string') setHeard(next.heard)
      if (typeof next.error === 'string') setVoiceError(next.error)
    })
    if (!recognition) {
      setVoiceError('Voice commands are not available in this browser. Read aloud still works.')
      return
    }
    recognitionRef.current = recognition
    try {
      recognition.start()
      setListening(true)
    } catch {
      setVoiceError('Voice commands could not start. Tap to try again.')
    }
  }

  return (
    <section className={`view trail-view trail-view--${stop.kind ?? 'standard'}`} aria-labelledby="view-heading">
      <header className="topbar trail-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Return home"><Icon name="back" /></button>
        <div className="trail-identity">
          <span className="trail-identity__item"><Icon name={search.itemId} size={15} />{search.itemLabel}</span>
          <strong>{stage.name === 'safety' || stage.name === 'final' ? stage.label : `Place ${stage.current} of ${stage.total}`}</strong>
        </div>
        <button className="text-button" onClick={onEditClues}>Clues</button>
      </header>

      <div className="trail-route">
        <div className="trail-route__meta">
          <span>{stage.label}</span>
          <strong>{totalChecked ? `${totalChecked} ${totalChecked === 1 ? 'spot' : 'spots'} ruled out` : 'Trail ready'}</strong>
        </div>
        <div className="trail-progress" role="progressbar" aria-label={`${stage.label} progress`} aria-valuemin={1} aria-valuemax={stage.total} aria-valuenow={stage.current} aria-valuetext={stage.name === 'safety' || stage.name === 'final' ? stage.label : `Place ${stage.current} of ${stage.total} in the ${stage.label.toLocaleLowerCase()}`}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article key={stop.id} className={`stop-card stop-card--${stop.kind ?? 'standard'}${departing ? ' is-departing' : ''}`}>
        <div className="stop-card__heading">
          <div className="stop-card__copy">
            <h1 ref={headingRef} id="view-heading" tabIndex={-1}>{stop.title}</h1>
            <p className="stop-card__instruction">{stop.instruction}</p>
          </div>
          <span className="stop-marker" aria-hidden="true"><Icon name="trail" size={17} /><strong>{search.currentIndex + 1}</strong></span>
        </div>
        {stop.reason && <div className="reason"><span className="reason__icon"><Icon name={stop.kind === 'home' ? 'pin' : ['history', 'learned'].includes(stop.kind ?? '') ? 'history' : stop.kind === 'safety' ? 'spark' : 'trail'} size={17} /></span><span><strong>Why here</strong>{stop.reason}</span></div>}

        <div className="spot-list__heading"><strong>Check one spot at a time</strong><span>{checked.length} of {stop.spots.length}</span></div>
        <div className="spot-list" role="group" aria-label={`Places to check at ${stop.title}`}>
          {stop.spots.map((spot, index) => {
            const isChecked = checked.includes(spot)
            return (
              <button key={spot} className={isChecked ? 'spot-row is-checked' : 'spot-row'} onClick={() => onToggleSpot(spot)} aria-pressed={isChecked}>
                <span className="spot-row__check"><Icon name="check" size={17} /></span>
                <span className="spot-row__label">{spot}</span>
                <small aria-hidden="true">{isChecked ? 'Checked' : `${index + 1}`}</small>
              </button>
            )
          })}
        </div>
        <p className="sr-only" aria-live="polite">{checked.length} of {stop.spots.length} spots checked in this area.</p>
        {areaChecked && <p className="area-complete"><Icon name="check" size={16} />This area is fully checked. Move on when you’re ready.</p>}

        <aside className="side-quest-note">
          <span className="side-quest-note__icon"><Icon name="calm" size={18} /></span>
          <span><strong>Side-quest shield</strong>Stay in this area. No organizing or “quick checks” elsewhere yet. Sneaky bastard.</span>
        </aside>
      </article>

      <div className="trail-utilities" aria-label="Search assistance">
        <button className="voice-tool" onClick={readCurrent}><Icon name="volume" size={18} /> Read aloud</button>
        <button className={listening ? 'voice-tool is-listening' : 'voice-tool'} onClick={toggleListening} disabled={!voiceSupported} title={!voiceSupported ? 'Not supported by this browser' : undefined} aria-label={voiceSupported ? (listening ? 'Stop hands-free listening' : 'Start hands-free listening') : 'Hands-free voice commands are unavailable in this browser'}>
          <Icon name="voice" size={18} /> {listening ? 'Listening…' : 'Hands-free'}
        </button>
      </div>
      {(heard || voiceError || voiceStatus) && <p className={voiceError ? 'voice-status is-error' : 'voice-status'} aria-live="polite">{voiceError || voiceStatus || `Heard: “${heard}”`}</p>}

      <div className="sticky-actions trail-action-dock">
        <div className="trail-action-dock__main">
          <button className="button button--found" onClick={onFound} disabled={departing}><Icon name="spark" size={20} /> Found it</button>
          <button className="button button--primary" onClick={advanceTrail} disabled={departing}>{nextLabel}</button>
        </div>
        <button className="trail-reset-button" onClick={onCalm} disabled={departing}><FeatherMark className="reset-action-feather" />I need a reset</button>
      </div>
    </section>
  )
}
