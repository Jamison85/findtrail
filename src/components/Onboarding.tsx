import { useState } from 'react'
import { FeatherMark } from './FeatherMark'
import { Icon } from './Icon'

export const ONBOARDING_STORAGE_KEY = 'findtrail:onboarding-complete-v1'

export function hasCompletedOnboarding(): boolean {
  try {
    return window.localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function shouldShowOnboarding(): boolean {
  if (hasCompletedOnboarding()) return false

  try {
    const hasExistingUse = Boolean(
      window.localStorage.getItem('findtrail:data:v3')
      || window.localStorage.getItem('findtrail:data:v2'),
    )
    return !hasExistingUse
  } catch {
    return true
  }
}

function rememberOnboarding(): void {
  try {
    window.localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
  } catch {
    // Onboarding still works when storage is unavailable; it may simply reappear later.
  }
}

const steps = [
  {
    eyebrow: 'Start simple',
    title: 'You lost something. Start with what you know.',
    copy: 'Pick what went missing. FindTrail asks only a few quick questions to narrow the search.',
    visual: 'items',
  },
  {
    eyebrow: 'No perfect memory',
    title: 'Give it the clues you actually remember.',
    copy: 'Choose the closest answer. FindTrail turns those small clues into a focused search trail.',
    visual: 'clues',
  },
  {
    eyebrow: 'Keep moving',
    title: 'Check one likely place at a time.',
    copy: 'Mark the spot, move to the next one, and use the feather reset if the search starts getting frantic.',
    visual: 'trail',
  },
] as const

export function Onboarding({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const current = steps[step]
  const finalStep = step === steps.length - 1

  function finish() {
    rememberOnboarding()
    onComplete()
  }

  return (
    <section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <header className="onboarding__topbar">
        <div className="onboarding__brand">
          <span className="onboarding__brand-mark"><Icon name="trail" size={19} /></span>
          <strong>FindTrail</strong>
        </div>
        <button type="button" className="onboarding__skip" onClick={finish}>Skip</button>
      </header>

      <div className="onboarding__body" aria-label={`Onboarding step ${step + 1} of ${steps.length}`}>
        <div className="onboarding__visual" aria-hidden="true">
          {current.visual === 'items' && (
            <div className="onboarding-items">
              <span className="onboarding-item is-selected"><Icon name="keys" size={25} /><b>Keys</b></span>
              <span className="onboarding-item"><Icon name="wallet" size={25} /><b>Wallet</b></span>
              <span className="onboarding-item"><Icon name="phone" size={25} /><b>Phone</b></span>
            </div>
          )}

          {current.visual === 'clues' && (
            <div className="onboarding-clues">
              <span className="onboarding-clues__question"><small>Last place</small><strong>Where do you remember having it?</strong></span>
              <span className="onboarding-clue is-selected"><Icon name="home" size={18} />At home<Icon name="check" size={16} /></span>
              <span className="onboarding-clue">In the car</span>
              <span className="onboarding-clue">At work</span>
            </div>
          )}

          {current.visual === 'trail' && (
            <div className="onboarding-trail">
              <div className="onboarding-trail__route"><span className="is-done" /><span className="is-current" /><span /></div>
              <article>
                <small>Next stop</small>
                <strong>The landing zone</strong>
                <p>Check the first place you normally set things down.</p>
                <span className="onboarding-trail__spot"><Icon name="check" size={15} />Entry table</span>
              </article>
              <span className="onboarding-feather"><FeatherMark /><b>Reset</b></span>
            </div>
          )}
        </div>

        <div className="onboarding__copy">
          <span className="eyebrow">{current.eyebrow}</span>
          <h1 id="onboarding-title">{current.title}</h1>
          <p>{current.copy}</p>
        </div>
      </div>

      <footer className="onboarding__footer">
        <div className="onboarding__privacy"><Icon name="lock" size={14} />Your trail stays private on this device.</div>

        <div className="onboarding__progress" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((_, index) => <span key={index} className={index === step ? 'is-current' : index < step ? 'is-complete' : ''} />)}
        </div>

        <div className="onboarding__actions">
          {step > 0
            ? <button type="button" className="button button--secondary" onClick={() => setStep((value) => value - 1)}>Back</button>
            : <span />}
          <button
            type="button"
            className="button button--primary"
            onClick={() => finalStep ? finish() : setStep((value) => value + 1)}
          >
            {finalStep ? 'Start finding' : 'Next'}
            <Icon name="forward" size={18} />
          </button>
        </div>
      </footer>
    </section>
  )
}
