import { useState } from 'react'
import type { ActiveSearch, Screen } from '../types'
import { Icon } from './Icon'
import { clearNextStep } from './clearNextStep'

interface CalmResetProps {
  search: ActiveSearch | null
  returnScreen: Screen
  onResume: () => void
}

export function CalmReset({ search, returnScreen, onResume }: CalmResetProps) {
  const [breathing, setBreathing] = useState(false)
  const next = clearNextStep(search, returnScreen)

  return (
    <section className="view reset-journey" aria-labelledby="view-heading">
      <div className="reset-journey__scene" aria-hidden="true" />
      <div className="reset-journey__layout">
        <header className="reset-journey__top">
          <strong>Reset</strong>
          <button className="icon-button reset-journey__exit" onClick={onResume} aria-label="Close reset"><Icon name="close" size={21} /></button>
        </header>
        <div className="reset-journey__message">
          <h1 id="view-heading" tabIndex={-1}>Take a moment.</h1>
          {search && <p>Your search is saved.</p>}
        </div>
        <div className="reset-journey__bottom">
          {search && <div className="reset-next">
            {next.spot && <span>{next.kind === 'safety' ? 'Safety first' : 'Next spot'}</span>}
            <strong>{next.spot ?? next.title}</strong>
            {next.kind === 'safety' && <p>{next.instruction}</p>}
          </div>}
          <button className="button button--primary reset-journey__action" onClick={onResume}>{search ? 'Back to search' : 'Back to home'}</button>
          <button className="text-button reset-journey__breathing" aria-expanded={breathing} aria-controls="reset-breathing-cue" onClick={() => setBreathing((open) => !open)}>{breathing ? 'Hide breathing cue' : 'Breathing cue'}</button>
          <p id="reset-breathing-cue" className="reset-journey__breath-copy" hidden={!breathing}>Breathe gently in. Let your breath out slowly, at your own pace.</p>
        </div>
      </div>
    </section>
  )
}
