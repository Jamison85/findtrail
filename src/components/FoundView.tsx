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
  currentStepTitle?: string
  value: string
  foundInCurrentArea: boolean | null
  saveAsHome: boolean
  pinCustomItem: boolean
  onChange: (value: string) => void
  onFoundInCurrentArea: (value: boolean) => void
  onSaveAsHome: (value: boolean) => void
  onPinCustomItem: (value: boolean) => void
  onSave: () => void
  onDone?: () => void
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

export function FoundView({ search, currentStepTitle, value, foundInCurrentArea, saveAsHome, pinCustomItem, onChange, onFoundInCurrentArea, onSaveAsHome, onPinCustomItem, onSave, onDone, onBack }: FoundViewProps) {
  const stop = currentStepTitle ? search.stops[search.currentIndex] : undefined
  const options = getFoundSuggestions(search.itemId, stop).slice(0, 5)
  const ready = Boolean(value.trim())
  const foundLabel = search.itemId === 'other' ? search.itemLabel : `your ${search.itemLabel.toLocaleLowerCase()}`

  return (
    <section className={`view found-view found-view--${search.itemId}`} aria-labelledby="view-heading">
      <header className="found-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back to search"><Icon name="back" /></button>
        <span className="found-local"><Icon name="lock" size={13} />Local only</span>
      </header>

      <div className="found-intro">
        <h1 id="view-heading" tabIndex={-1}>
          <span className="found-intro__seal" aria-hidden="true"><Icon name="check" size={24} /></span>
          <span>Found {foundLabel}.</span>
        </h1>
      </div>

      <form className="found-capture" aria-labelledby="found-location-heading" onSubmit={(event) => {
        event.preventDefault()
        if (ready) onSave()
      }}>
        <div className="found-capture__heading">
          <div>
            <h2 id="found-location-heading">Where did it turn up?</h2>
          </div>
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
        </label>

        <div className="found-memory-options">
          <FoundToggle
            label={`Make this the usual spot for ${search.itemLabel.toLocaleLowerCase()}`}
            detail="FindTrail will suggest it again next time."
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

        {currentStepTitle && (
          <details className="found-optional">
            <summary><span>Help improve the trail <small>Optional</small></span><Icon name="forward" size={17} /></summary>
            <div className="found-area-choice" role="group" aria-label={`Did “${currentStepTitle}” help you find it?`}>
              <strong>Did “{currentStepTitle}” help you find it?</strong>
              <div>
                <button type="button" className={foundInCurrentArea === true ? 'is-selected' : ''} aria-pressed={foundInCurrentArea === true} onClick={() => onFoundInCurrentArea(true)}>Yes, this step</button>
                <button type="button" className={foundInCurrentArea === false ? 'is-selected' : ''} aria-pressed={foundInCurrentArea === false} onClick={() => onFoundInCurrentArea(false)}>No, found another way</button>
              </div>
              <p>A yes helps put this step earlier next time. Your exact place is saved either way.</p>
            </div>
          </details>
        )}

        <button className="button button--primary button--wide found-save" type="submit" disabled={!ready}>
          Save this spot
        </button>
        {onDone && <button type="button" className="text-button found-done" onClick={onDone}>Done without saving</button>}
      </form>
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
            <small>{summary.savedAsHome ? 'FindTrail can suggest this spot next time.' : 'This found place may appear earlier next time.'}</small>
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
