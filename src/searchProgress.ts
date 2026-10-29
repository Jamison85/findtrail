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

// Partial areas are unfinished work, not skipped areas. Keep these separate so
// the UI never counts a partially searched room as a zero-check skip.
export function unfinishedPlaces(search: ActiveSearch, stops = allSearchStops(search)): SearchStop[] {
  return stops.filter((stop) => isSearchArea(stop) && !search.excludedStopIds?.includes(stop.id)
    && (search.checkedSpots[stop.id]?.length ?? 0) > 0
    && checkedSpotsAt(search, stop).length < stop.spots.length)
}

function exactPlace(value: string): string | null {
  const key = value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
  // Relative descriptions refer to different physical places in each area.
  return /^(the surface beside it|the floor directly below|floor nearby|floor below|surface above or below)$/.test(key) ? null : key
}

export function checkedSpotsAt(search: ActiveSearch, stop: SearchStop): string[] {
  const exact = new Set(Object.values(search.checkedSpots).flat().map(exactPlace).filter(Boolean))
  return stop.spots.filter((spot) => search.checkedSpots[stop.id]?.includes(spot) || (exactPlace(spot) !== null && exact.has(exactPlace(spot))))
}
