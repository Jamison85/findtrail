import type { ActiveSearch, SearchStop } from '../types'
import { Icon } from './Icon'
import { checkedSpotsAt } from '../searchProgress'

export function SkippedPlaces({ places, onReview }: { places: SearchStop[]; onReview: (stopId: string) => void }) {
  if (!places.length) return null

  return (
    <section className="skipped-places" aria-labelledby="skipped-places-heading">
      <div>
        <h2 id="skipped-places-heading">Places left open</h2>
        <p>Choose one to check now. Your next step will be here when you return.</p>
      </div>
      <div className="skipped-places__list">
        {places.map((place) => (
          <button key={place.id} type="button" onClick={() => onReview(place.id)}>
            <span>{place.title}</span><Icon name="forward" size={16} />
          </button>
        ))}
      </div>
    </section>
  )
}

export function UnfinishedPlaces({ search, places, onReview }: { search: ActiveSearch; places: SearchStop[]; onReview: (stopId: string) => void }) {
  if (!places.length) return null
  return <section className="skipped-places" aria-labelledby="unfinished-places-heading">
    <div><h2 id="unfinished-places-heading">Areas still unfinished</h2><p>Your checks are saved. Pick up the remaining spots.</p></div>
    <div className="skipped-places__list">{places.map((place) => <button key={place.id} onClick={() => onReview(place.id)}>
      <span>{place.title}<small>{checkedSpotsAt(search, place).length} of {place.spots.length} checked</small></span><Icon name="forward" size={16} />
    </button>)}</div>
  </section>
}
