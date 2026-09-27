import type { SearchStop } from '../types'
import { Icon } from './Icon'

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
