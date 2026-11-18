import { Icon } from './Icon'

interface SavedSpotViewProps {
  itemLabel: string
  spot: string
  onBack: () => void
  onReset: () => void
  onFound: () => void
  onContinue: () => void
}

export function SavedSpotView({ itemLabel, spot, onBack, onReset, onFound, onContinue }: SavedSpotViewProps) {
  return (
    <section className="view saved-spot-view" aria-labelledby="view-heading">
      <header className="saved-spot-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Return home"><Icon name="back" /></button>
        <strong>Finding {itemLabel.toLocaleLowerCase()}</strong>
        <button className="text-button" onClick={onReset}>Reset</button>
      </header>
      <div className="saved-spot-detail">
        <span className="saved-spot-label"><Icon name="pin" size={20} /> Saved spot</span>
        <h1 id="view-heading" tabIndex={-1}>{spot}</h1>
        <p>You saved this as the usual spot for {itemLabel.toLocaleLowerCase()}.</p>
      </div>
      <div className="saved-spot-actions">
        <button className="button button--primary" onClick={onFound}>Found it</button>
        <button className="button button--secondary" onClick={onContinue}>Keep searching</button>
      </div>
    </section>
  )
}
