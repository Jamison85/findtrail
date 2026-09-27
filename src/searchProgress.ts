import type { ActiveSearch, SearchStop } from './types'

function isSearchArea(stop: SearchStop): boolean {
  return stop.kind !== 'safety' && stop.kind !== 'final'
}

export function visitedAreaCount(search: ActiveSearch, stops = search.stops, foundAtStopId?: string): number {
  return stops.filter((stop) => isSearchArea(stop)
    && ((search.checkedSpots[stop.id]?.length ?? 0) > 0 || stop.id === foundAtStopId)).length
}

export function skippedPlaces(search: ActiveSearch, stops = search.stops): SearchStop[] {
  const skipped = new Set(search.skippedStops ?? [])
  return stops.filter((stop) => isSearchArea(stop)
    && skipped.has(stop.id)
    && (search.checkedSpots[stop.id]?.length ?? 0) === 0)
}
