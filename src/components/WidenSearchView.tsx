import { getFocusedStops, getWiderStops } from '../trailEngine'
import { skippedPlaces, visitedAreaCount } from '../searchProgress'
import type { ActiveSearch } from '../types'
import { Icon } from './Icon'
import { FeatherMark } from './FeatherMark'
import { SkippedPlaces } from './SkippedPlaces'

interface WidenSearchViewProps {
  search: ActiveSearch
  onWiden: () => void
  onReviewSkipped: (stopId: string) => void
  onFound: () => void
  onReset: () => void
  onHome: () => void
}

export function WidenSearchView({ search, onWiden, onReviewSkipped, onFound, onReset, onHome }: WidenSearchViewProps) {
  const focusedStops = getFocusedStops(search.stops)
  const widerStops = getWiderStops(search.stops)
  const checkedSpotCount = focusedStops.reduce((total, stop) => total + (search.checkedSpots[stop.id]?.length ?? 0), 0)
  const openPlaces = skippedPlaces(search, focusedStops)
  const skippedCount = openPlaces.length
  const visitedCount = visitedAreaCount(search, focusedStops)
  const placeLabel = `${visitedCount} suggested ${visitedCount === 1 ? 'area' : 'areas'} visited`
  const spotLabel = `${checkedSpotCount} exact ${checkedSpotCount === 1 ? 'spot' : 'spots'} checked${skippedCount ? ` · ${skippedCount} skipped` : ''}`

  return (
    <section className="view widen-view" aria-labelledby="view-heading">
      <header className="widen-topbar">
        <button className="icon-button" onClick={onHome} aria-label="Save trail and return home"><Icon name="home" size={20} /></button>
        <div className="widen-identity">
          <span><Icon name={search.itemId} size={18} /></span>
          <div><small>Looking for</small><strong>{search.itemLabel}</strong></div>
        </div>
        <button className="text-button" onClick={onFound}>Found it</button>
      </header>

      <div className="widen-hero">
        <span className="widen-hero__mark" aria-hidden="true"><Icon name="check" size={25} /></span>
        <div>
          <span className="eyebrow">Focused pass complete</span>
          <h1 id="view-heading" tabIndex={-1}>Pause before going wider.</h1>
          <p>You reached the end of the first suggested areas. Places you skipped are still open. The next pass stays one place at a time.</p>
        </div>
      </div>

      <div className="widen-status" role="status" aria-label={`${placeLabel}. ${spotLabel}. Your trail is saved.`}>
        <span><Icon name="trail" size={18} /></span>
        <p><strong>{placeLabel}</strong><small>{spotLabel} · trail saved</small></p>
      </div>

      <SkippedPlaces places={openPlaces} onReview={onReviewSkipped} />

      <section className="widen-panel" aria-labelledby="widen-heading">
        <header>
          <span className="widen-panel__number">2</span>
          <div><small>Next pass</small><h2 id="widen-heading">Search a little wider</h2></div>
        </header>
        <p>These are the next three useful places. You will still see only one place at a time.</p>
        <ol className="widen-preview" aria-label={`Next places to check for ${search.itemLabel}`}>
          {widerStops.map((stop, index) => (
            <li key={stop.id}><span>{index + 1}</span><strong>{stop.title}</strong></li>
          ))}
        </ol>
        <button className="button button--primary button--wide" onClick={onWiden}>
          Search these {widerStops.length} places<Icon name="forward" size={18} />
        </button>
      </section>

      <div className="widen-choices" aria-label="Other next steps">
        <button className="button button--secondary" onClick={onReset}><FeatherMark className="reset-action-feather" />Breathing reset</button>
        <button className="text-button" onClick={onFound}><Icon name="spark" size={16} />I found it after all</button>
        <button className="text-button text-button--muted" onClick={onHome}>Save and leave</button>
      </div>
    </section>
  )
}
