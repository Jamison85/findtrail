import { ITEM_BY_ID } from '../data'
import { getFoundSuggestions } from '../trailEngine'
import type { ActiveSearch, ItemId } from '../types'
import { Icon } from './Icon'

export interface FoundSummary {
  itemId: ItemId
  itemLabel: string
  location: string
  seconds: number
  stopsChecked: number
  savedAsHome: boolean
}

interface FoundViewProps {
  search: ActiveSearch
  value: string
  saveAsHome: boolean
  pinCustomItem: boolean
  onChange: (value: string) => void
  onSaveAsHome: (value: boolean) => void
  onPinCustomItem: (value: boolean) => void
  onSave: () => void
  onBack: () => void
}

interface CompleteViewProps {
  summary: FoundSummary
  durationLabel: string
  onHome: () => void
  onAnother: () => void
}

interface FoundToggleProps {
  label: string
  detail: string
  checked: boolean
  onChange: (value: boolean) => void
}

function FoundToggle({ label, detail, checked, onChange }: FoundToggleProps) {
  return (
    <label className="found-toggle">
      <span><strong>{label}</strong><small>{detail}</small></span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

function SuccessTrail({ icon }: { icon: ItemId }) {
  const item = ITEM_BY_ID[icon]
  return (
    <div className="found-signal" aria-hidden="true">
      <svg viewBox="0 0 320 92" preserveAspectRatio="none">
        <path className="found-signal__shadow" d="M4 66C57 66 58 25 115 30c50 5 56 42 108 30 35-8 44-28 83-33" />
        <path className="found-signal__path" d="M4 66C57 66 58 25 115 30c50 5 56 42 108 30 35-8 44-28 83-33" />
      </svg>
      <span className="found-signal__start" />
      <span className="found-signal__seal"><Icon name={item.icon} size={25} /><i><Icon name="check" size={13} /></i></span>
    </div>
  )
}

export function FoundView({ search, value, saveAsHome, pinCustomItem, onChange, onSaveAsHome, onPinCustomItem, onSave, onBack }: FoundViewProps) {
  const item = ITEM_BY_ID[search.itemId]
  const stop = search.stops[search.currentIndex]
  const options = getFoundSuggestions(search.itemId, stop).slice(0, 5)
  const ready = Boolean(value.trim())

  return (
    <section className={`view found-view found-view--${search.itemId}`} aria-labelledby="view-heading">
      <header className="found-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back to search"><Icon name="back" /></button>
        <div className="found-identity">
          <span><Icon name={item.icon} size={18} /></span>
          <div><small>Found</small><strong>{search.itemLabel}</strong></div>
        </div>
        <span className="found-local"><Icon name="lock" size={13} />Local only</span>
      </header>

      <div className="found-intro">
        <SuccessTrail icon={search.itemId} />
        <h1 id="view-heading" tabIndex={-1}>There it is.</h1>
        <p>Take one useful second to note the exact place. FindTrail will use it to make the next search shorter.</p>
      </div>

      <section className="found-capture" aria-labelledby="found-location-heading">
        <div className="found-capture__heading">
          <div>
            <h2 id="found-location-heading">Where did it turn up?</h2>
            <p>Choose a close match or type the exact spot. Specific beats perfect.</p>
          </div>
          <span className={ready ? 'found-ready is-ready' : 'found-ready'} aria-live="polite">
            <Icon name={ready ? 'check' : 'trail'} size={14} />{ready ? 'Ready' : 'One detail'}
          </span>
        </div>

        <div className="location-chips" role="group" aria-label={`Suggested found places for ${search.itemLabel}`}>
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={value === option ? 'chip is-selected' : 'chip'}
              aria-pressed={value === option}
              onClick={() => onChange(option)}
            >
              {value === option && <Icon name="check" size={14} />}{option}
            </button>
          ))}
        </div>

        <label className="field found-location-field">
          <span>Exact place</span>
          <input
            aria-label="Exact place"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Jacket pocket, under the mail…"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
          />
          <small>A useful detail helps: “blue bowl,” not just “kitchen.”</small>
        </label>

        <div className="found-learning" role="note">
          <span><Icon name="trail" size={18} /></span>
          <p><strong>This find already teaches the trail.</strong><small>The search area that worked can move earlier next time.</small></p>
        </div>

        <div className="found-memory-options">
          <FoundToggle
            label={`Make this the home spot for ${search.itemLabel}`}
            detail="FindTrail will check here before learned guesses."
            checked={saveAsHome}
            onChange={onSaveAsHome}
          />
          {search.itemId === 'other' && saveAsHome && (
            <FoundToggle
              label={`Pin ${search.itemLabel} on Home`}
              detail="Start this search again with one tap."
              checked={pinCustomItem}
              onChange={onPinCustomItem}
            />
          )}
        </div>

        <button className="button button--primary button--wide found-save" onClick={onSave} disabled={!ready}>
          <Icon name="check" size={19} />Save this found place
        </button>
      </section>
    </section>
  )
}

export function CompleteView({ summary, durationLabel, onHome, onAnother }: CompleteViewProps) {
  const item = ITEM_BY_ID[summary.itemId]
  return (
    <section className={`view complete-view complete-view--${summary.itemId}`} aria-labelledby="view-heading">
      <div className="complete-sheet">
        <div className="complete-mark" aria-hidden="true">
          <Icon name={item.icon} size={31} />
          <span><Icon name="check" size={15} /></span>
        </div>
        <h1 id="view-heading" tabIndex={-1}>Found and remembered.</h1>
        <p>The search is over. The useful part stays with you.</p>

        <dl className="complete-record">
          <div className="complete-record__place">
            <dt>{summary.itemLabel} turned up at</dt>
            <dd>{summary.location}</dd>
          </div>
          <div><dt>Places visited</dt><dd>{summary.stopsChecked}</dd></div>
          <div><dt>Search time</dt><dd>{durationLabel}</dd></div>
        </dl>

        <div className="complete-learning" role="status">
          <span><Icon name={summary.savedAsHome ? 'home' : 'trail'} size={19} /></span>
          <p>
            <strong>{summary.savedAsHome ? 'Home spot saved.' : 'Added to found history.'}</strong>
            <small>{summary.savedAsHome ? 'FindTrail will check here first next time.' : 'This search area can move earlier next time.'}</small>
          </p>
        </div>

        <div className="complete-actions">
          <button className="button button--primary button--wide" onClick={onHome}>Back home</button>
          <button className="button button--secondary button--wide" onClick={onAnother}>Find another item</button>
        </div>
      </div>
    </section>
  )
}
