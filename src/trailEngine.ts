import { CLUE_PROMOTIONS, ITEM_BY_ID, STOPS } from './data'
import { itemIdentity } from './storage'
import type { ActiveSearch, FoundEntry, ItemId, SavedItem, SearchStop } from './types'

export const FOCUSED_PASS_SIZE = 3
export const WIDER_PASS_SIZE = 3

export type TrailStageName = 'safety' | 'focused' | 'wider' | 'final'

export interface TrailStage {
  name: TrailStageName
  label: string
  current: number
  total: number
}

function searchableStopIndices(stops: SearchStop[]): number[] {
  return stops.flatMap((stop, index) => stop.kind === 'safety' || stop.kind === 'final' ? [] : [index])
}

export function compactTrail(stops: SearchStop[]): SearchStop[] {
  const safetyStops = stops.filter((stop) => stop.kind === 'safety')
  const searchStops = stops
    .filter((stop) => stop.kind !== 'safety' && stop.kind !== 'final')
    .slice(0, FOCUSED_PASS_SIZE + WIDER_PASS_SIZE)
  const finalStop = stops.find((stop) => stop.kind === 'final')
  return [...safetyStops, ...searchStops, ...(finalStop ? [finalStop] : [])]
}

export function compactActiveSearch(search: ActiveSearch): ActiveSearch {
  const stops = compactTrail(search.stops)
  if (stops.length === search.stops.length && stops.every((stop, index) => stop.id === search.stops[index]?.id)) return search
  const currentId = search.stops[search.currentIndex]?.id
  const matchingIndex = stops.findIndex((stop) => stop.id === currentId)
  const finalIndex = stops.findIndex((stop) => stop.kind === 'final')
  return {
    ...search,
    stops,
    currentIndex: matchingIndex >= 0 ? matchingIndex : Math.max(0, finalIndex >= 0 ? finalIndex : stops.length - 1),
  }
}

export function getFocusedStops(stops: SearchStop[]): SearchStop[] {
  return searchableStopIndices(stops).slice(0, FOCUSED_PASS_SIZE).map((index) => stops[index])
}

export function getWiderStops(stops: SearchStop[]): SearchStop[] {
  return searchableStopIndices(stops)
    .slice(FOCUSED_PASS_SIZE, FOCUSED_PASS_SIZE + WIDER_PASS_SIZE)
    .map((index) => stops[index])
}

export function getWiderStartIndex(stops: SearchStop[]): number | null {
  return searchableStopIndices(stops)[FOCUSED_PASS_SIZE] ?? null
}

export function isFocusedPassComplete(stops: SearchStop[], currentIndex: number): boolean {
  const indices = searchableStopIndices(stops)
  return indices.length > FOCUSED_PASS_SIZE && currentIndex === indices[FOCUSED_PASS_SIZE - 1]
}

export function isWiderPassComplete(stops: SearchStop[], currentIndex: number): boolean {
  const indices = searchableStopIndices(stops)
  const wider = indices.slice(FOCUSED_PASS_SIZE, FOCUSED_PASS_SIZE + WIDER_PASS_SIZE)
  return wider.length > 0 && currentIndex === wider.at(-1)
}

export function getTrailStage(stops: SearchStop[], currentIndex: number): TrailStage {
  const stop = stops[currentIndex]
  if (stop?.kind === 'safety') {
    const safetyIndices = stops.flatMap((candidate, index) => candidate.kind === 'safety' ? [index] : [])
    return { name: 'safety', label: 'Safety first', current: safetyIndices.indexOf(currentIndex) + 1, total: safetyIndices.length }
  }
  if (stop?.kind === 'final') return { name: 'final', label: 'Final sweep', current: 1, total: 1 }

  const searchIndices = searchableStopIndices(stops)
  const searchPosition = Math.max(0, searchIndices.indexOf(currentIndex))
  if (searchPosition < FOCUSED_PASS_SIZE) {
    return {
      name: 'focused',
      label: 'Focused pass',
      current: searchPosition + 1,
      total: Math.min(FOCUSED_PASS_SIZE, searchIndices.length),
    }
  }

  const widerPosition = searchPosition - FOCUSED_PASS_SIZE
  return {
    name: 'wider',
    label: 'Wider pass',
    current: widerPosition + 1,
    total: Math.min(WIDER_PASS_SIZE, Math.max(1, searchIndices.length - FOCUSED_PASS_SIZE)),
  }
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase()
}

function slug(value: string): string {
  return normalized(value).replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'place'
}

function matchesItem(entry: Pick<FoundEntry, 'itemId' | 'itemLabel'>, itemId: ItemId, itemLabel: string): boolean {
  return itemIdentity(entry.itemId, entry.itemLabel) === itemIdentity(itemId, itemLabel)
}

export function mostLikelyLocation(history: FoundEntry[], itemId: ItemId, itemLabel: string): { location: string; count: number } | null {
  const counts = new Map<string, { location: string; count: number; latest: number }>()
  history
    .filter((entry) => matchesItem(entry, itemId, itemLabel))
    .forEach((entry) => {
      const key = normalized(entry.foundLocation)
      if (!key) return
      const current = counts.get(key)
      const latest = Date.parse(entry.foundAt) || 0
      counts.set(key, { location: entry.foundLocation, count: (current?.count ?? 0) + 1, latest: Math.max(current?.latest ?? 0, latest) })
    })

  const best = [...counts.values()].sort((a, b) => b.count - a.count || b.latest - a.latest)[0]
  return best ? { location: best.location, count: best.count } : null
}

export function mostSuccessfulStop(history: FoundEntry[], itemId: ItemId, itemLabel: string): { stopId: string; count: number } | null {
  const counts = new Map<string, { stopId: string; count: number; latest: number }>()
  history.filter((entry) => matchesItem(entry, itemId, itemLabel) && entry.foundStopId).forEach((entry) => {
    const stopId = entry.foundStopId as string
    if (stopId.startsWith('home-') || stopId.startsWith('history-') || ['safety-help', 'card-safety'].includes(stopId)) return
    const current = counts.get(stopId)
    const latest = Date.parse(entry.foundAt) || 0
    counts.set(stopId, { stopId, count: (current?.count ?? 0) + 1, latest: Math.max(current?.latest ?? 0, latest) })
  })
  const best = [...counts.values()].sort((a, b) => b.count - a.count || b.latest - a.latest)[0]
  return best ? { stopId: best.stopId, count: best.count } : null
}

function historyStop(history: FoundEntry[], itemId: ItemId, itemLabel: string): SearchStop | null {
  const likely = mostLikelyLocation(history, itemId, itemLabel)
  if (!likely) return null
  return {
    id: `history-${slug(likely.location)}`,
    title: 'Your usual suspect',
    instruction: `Check ${likely.location} first. That is where ${itemLabel.toLocaleLowerCase()} turned up ${likely.count === 1 ? 'last time' : `${likely.count} times`}.`,
    spots: [likely.location, 'The surface beside it', 'The floor directly below'],
    reason: 'Suggested from your own found-item history.',
    kind: 'history',
  }
}

function savedHomeStop(savedItems: SavedItem[], itemId: ItemId, itemLabel: string): SearchStop | null {
  const saved = savedItems.find((entry) => itemIdentity(entry.itemId, entry.itemLabel) === itemIdentity(itemId, itemLabel))
  if (!saved?.homeSpot.trim()) return null
  return {
    id: `home-${slug(itemIdentity(itemId, itemLabel))}`,
    title: 'Its saved home',
    instruction: `Start at ${saved.homeSpot}. You chose this as the home for ${itemLabel.toLocaleLowerCase()}.`,
    spots: [saved.homeSpot, 'The surface beside it', 'The floor directly below'],
    reason: 'Saved by you as its intentional home.',
    kind: 'home',
  }
}

export function buildTrail(itemId: ItemId, itemLabel: string, answers: Record<string, string>, history: FoundEntry[], savedItems: SavedItem[] = []): SearchStop[] {
  const item = ITEM_BY_ID[itemId]
  const orderedIds: string[] = []

  if (itemId === 'medicine' && ['urgent', 'unsure'].includes(answers.itemDetail)) orderedIds.push('safety-help')
  if (itemId === 'money' && ['card', 'both'].includes(answers.itemDetail)) orderedIds.push('card-safety')

  for (const questionId of ['lastPlace', 'lastAction', 'itemDetail']) {
    const value = answers[questionId]
    if (value) orderedIds.push(...(CLUE_PROMOTIONS[questionId]?.[value] ?? []))
  }

  orderedIds.push(...item.baseStops)
  if (!orderedIds.includes('slow-sweep')) orderedIds.push('slow-sweep')

  const seen = new Set<string>()
  const standardStops = orderedIds
    .filter((id) => STOPS[id] && !seen.has(id) && seen.add(id))
    .map((id) => ({ ...STOPS[id], spots: [...STOPS[id].spots] }))

  const safetyStops = standardStops.filter((stop) => stop.kind === 'safety')
  let remainingStops = standardStops.filter((stop) => stop.kind !== 'safety')
  const finalStop = remainingStops.find((stop) => stop.id === 'slow-sweep')
  remainingStops = remainingStops.filter((stop) => stop.id !== 'slow-sweep')

  const successful = mostSuccessfulStop(history, itemId, itemLabel)
  let learnedArea: SearchStop | null = null
  if (successful) {
    const match = remainingStops.find((stop) => stop.id === successful.stopId)
    if (match) {
      learnedArea = {
        ...match,
        kind: 'learned',
        reason: `${match.title} helped ${successful.count === 1 ? 'last time' : `${successful.count} times`} for this item.`,
      }
      remainingStops = remainingStops.filter((stop) => stop.id !== match.id)
    }
  }

  const home = savedHomeStop(savedItems, itemId, itemLabel)
  const learnedLocation = historyStop(history, itemId, itemLabel)
  const sameAsHome = home && learnedLocation && normalized(home.spots[0]) === normalized(learnedLocation.spots[0])
  const prioritizedStops = [
    ...(home ? [home] : []),
    ...(!sameAsHome && learnedLocation ? [learnedLocation] : []),
    ...(learnedArea ? [learnedArea] : []),
    ...remainingStops,
  ].slice(0, FOCUSED_PASS_SIZE + WIDER_PASS_SIZE)

  return compactTrail([
    ...safetyStops,
    ...prioritizedStops,
    ...(finalStop ? [finalStop] : []),
  ])
}

export function getFoundSuggestions(itemId: ItemId, stop: SearchStop | undefined): string[] {
  const fromStop = stop?.spots ?? []
  return [...new Set([...fromStop, ...ITEM_BY_ID[itemId].foundSuggestions])].slice(0, 10)
}
