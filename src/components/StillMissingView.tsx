import { ITEM_BY_ID } from '../data'
import { getRecoveryActions } from '../recovery'
import type { ActiveSearch } from '../types'
import { Icon } from './Icon'
import { FeatherMark } from './FeatherMark'

interface StillMissingViewProps {
  search: ActiveSearch
  onFound: () => void
  onReset: () => void
  onRestart: () => void
  onHome: () => void
}

interface RecoveryIntro {
  title: string
  detail: string
  priorityLabel: string
}

function recoveryIntro(search: ActiveSearch): RecoveryIntro {
  if (search.itemId === 'medicine' && search.answers.itemDetail === 'urgent') {
    return {
      title: 'Handle the dose first.',
      detail: 'The search can wait. Use the first step below now, then come back only when the immediate risk is covered.',
      priorityLabel: 'Safety first',
    }
  }

  if (search.itemId === 'wallet' || search.itemId === 'money') {
    return {
      title: 'Protect it before another search.',
      detail: 'You finished a useful pass. Secure anything at risk, then choose one deliberate next move.',
      priorityLabel: 'Protect first',
    }
  }

  if (search.itemId === 'phone') {
    return {
      title: 'Switch from searching to locating.',
      detail: 'You finished a useful pass. Let the device-finding tools do the next bit of work.',
      priorityLabel: 'Try this first',
    }
  }

  return {
    title: 'Pause the search loop.',
    detail: `You checked the strongest places for ${search.itemLabel.toLocaleLowerCase()}. Pick one next move and give it time to work.`,
    priorityLabel: 'Start here',
  }
}

export function StillMissingView({ search, onFound, onReset, onRestart, onHome }: StillMissingViewProps) {
  const actions = getRecoveryActions(search)
  const intro = recoveryIntro(search)
  const checkedSpotCount = Object.values(search.checkedSpots).reduce((total, spots) => total + spots.length, 0)
  const item = ITEM_BY_ID[search.itemId]
  const placeCount = `${search.stops.length} ${search.stops.length === 1 ? 'place' : 'places'}`
  const spotCount = `${checkedSpotCount} exact ${checkedSpotCount === 1 ? 'spot' : 'spots'}`

  return (
    <section className={`view end-view end-view--${search.itemId}`} aria-labelledby="view-heading">
      <header className="recovery-topbar">
        <button className="icon-button" onClick={onHome} aria-label="Save trail and return home"><Icon name="home" size={20} /></button>
        <div className="recovery-identity">
          <span><Icon name={item.icon} size={18} /></span>
          <div><small>Still looking for</small><strong>{search.itemLabel}</strong></div>
        </div>
        <button className="text-button recovery-found-shortcut" onClick={onFound}>Found it</button>
      </header>

      <div className="end-hero">
        <div className="end-view__mark" aria-hidden="true"><Icon name="trail" size={34} /></div>
        <div>
          <h1 id="view-heading" tabIndex={-1}>{intro.title}</h1>
          <p>{intro.detail}</p>
        </div>
      </div>

      <div className="recovery-status" role="status" aria-label={`Focused trail complete. ${placeCount} checked. ${spotCount} ruled out. Trail saved automatically.`}>
        <span className="recovery-status__mark"><Icon name="check" size={17} /></span>
        <span><strong>Focused trail complete</strong><small>{placeCount} checked{checkedSpotCount > 0 ? ` · ${spotCount} ruled out` : ''}</small></span>
        <small className="recovery-status__saved">Saved</small>
      </div>

      <section className="recovery-panel" aria-labelledby="recovery-heading">
        <div className="recovery-panel__heading">
          <h2 id="recovery-heading">Do one next move</h2>
          <p>Start at the top. You do not need to do everything at once.</p>
        </div>
        <ol className="recovery-actions" aria-label={`Next actions for ${search.itemLabel}`}>
          {actions.map((action, index) => (
            <li key={action.title} className={index === 0 ? 'recovery-step recovery-step--priority' : 'recovery-step'}>
              <span className="recovery-step__number">{index + 1}</span>
              <div>
                {index === 0 && <small>{intro.priorityLabel}</small>}
                <strong>{action.title}</strong>
                <p>{action.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="recovery-choice" aria-labelledby="recovery-choice-heading">
        <div className="recovery-choice__copy">
          <h2 id="recovery-choice-heading">Ready for another pass?</h2>
          <p>Reset your attention first, or repeat the same trail at half speed.</p>
        </div>
        <div className="recovery-choice__primary">
          <button className="button button--primary" onClick={onReset}><FeatherMark className="reset-action-feather" /><span>30-second reset</span></button>
          <button className="button button--secondary" onClick={onRestart}><Icon name="refresh" size={18} /><span>Repeat trail</span></button>
        </div>
        <div className="recovery-choice__quiet">
          <button className="text-button" onClick={onFound}><Icon name="spark" size={16} />I found it after all</button>
          <button className="text-button text-button--muted" onClick={onHome}>Save and leave</button>
        </div>
      </section>
    </section>
  )
}
