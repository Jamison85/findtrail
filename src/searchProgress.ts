import type { ActiveSearch, SearchStop } from './types'

function isSearchArea(stop: SearchStop): boolean {
  return stop.kind !== 'safety' && stop.kind !== 'final'
}

export function allSearchStops(search: ActiveSearch): SearchStop[] {
  const stops = [...(search.previousStops ?? []), ...search.stops]
  return stops.filter((stop, index) => stops.findIndex((candidate) => candidate.id === stop.id) === index)
}

export function visitedAreaCount(search: ActiveSearch, stops = allSearchStops(search), foundAtStopId?: string): number {
  return stops.filter((stop) => isSearchArea(stop)
    && ((search.checkedSpots[stop.id]?.length ?? 0) > 0 || stop.id === foundAtStopId)).length
}

export function skippedPlaces(search: ActiveSearch, stops = allSearchStops(search)): SearchStop[] {
  const skipped = new Set(search.skippedStops ?? [])
  return stops.filter((stop) => isSearchArea(stop)
    && skipped.has(stop.id)
    && !search.excludedStopIds?.includes(stop.id)
    && (search.checkedSpots[stop.id]?.length ?? 0) === 0)
}
