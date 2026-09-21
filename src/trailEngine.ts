import { CLUE_PROMOTIONS, ITEM_BY_ID, STOPS } from './data'
import { itemIdentity } from './storage'
import type { FoundEntry, ItemId, SavedItem, SearchStop } from './types'

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
  return [
    ...safetyStops,
    ...(home ? [home] : []),
    ...(!sameAsHome && learnedLocation ? [learnedLocation] : []),
    ...(learnedArea ? [learnedArea] : []),
    ...remainingStops,
    ...(finalStop ? [finalStop] : []),
  ]
}

export function getFoundSuggestions(itemId: ItemId, stop: SearchStop | undefined): string[] {
  const fromStop = stop?.spots ?? []
  return [...new Set([...fromStop, ...ITEM_BY_ID[itemId].foundSuggestions])].slice(0, 10)
}
