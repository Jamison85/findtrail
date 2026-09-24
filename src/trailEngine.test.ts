import { describe, expect, it } from 'vitest'
import { buildTrail, compactActiveSearch, getFocusedStops, getFoundSuggestions, getTrailStage, getWiderStops, isFocusedPassComplete, mostLikelyLocation, mostSuccessfulStop } from './trailEngine'
import type { FoundEntry, SavedItem } from './types'

const history: FoundEntry[] = [
  { id: '1', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Blue hoodie pocket', foundAt: '2026-09-10T10:00:00.000Z', answers: {}, stopsChecked: 2, durationSeconds: 80, foundStopId: 'pockets' },
  { id: '2', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Kitchen counter', foundAt: '2026-09-09T10:00:00.000Z', answers: {}, stopsChecked: 4, durationSeconds: 200, foundStopId: 'counters' },
  { id: '3', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Blue hoodie pocket', foundAt: '2026-09-08T10:00:00.000Z', answers: {}, stopsChecked: 3, durationSeconds: 110, foundStopId: 'pockets' },
]

const savedHome: SavedItem = {
  id: 'item:keys', itemId: 'keys', itemLabel: 'Keys', homeSpot: 'Entry bowl', pinned: false,
  createdAt: '2026-09-12T12:00:00.000Z', updatedAt: '2026-09-12T12:00:00.000Z',
}

describe('buildTrail', () => {
  it('uses situational clues before the generic item route', () => {
    const trail = buildTrail('keys', 'Keys', { itemDetail: 'car', lastPlace: 'home', lastAction: 'arrived' }, [])
    expect(trail[0].id).toBe('drop-zone')
    expect(trail.map((stop) => stop.id)).toContain('car')
  })

  it('promotes the user’s most common found location', () => {
    const trail = buildTrail('keys', 'Keys', { itemDetail: 'ring', lastPlace: 'unsure', lastAction: 'unsure' }, history)
    expect(trail[0].kind).toBe('history')
    expect(trail[0].instruction).toContain('Blue hoodie pocket')
    expect(mostLikelyLocation(history, 'keys', 'Keys')).toEqual({ location: 'Blue hoodie pocket', count: 2 })
  })

  it('places a saved home before learned suggestions and learns successful search areas', () => {
    const trail = buildTrail('keys', 'Keys', {}, history, [savedHome])
    expect(trail[0]).toMatchObject({ kind: 'home', spots: ['Entry bowl', 'The surface beside it', 'The floor directly below'] })
    expect(trail[1].kind).toBe('history')
    expect(trail[2]).toMatchObject({ id: 'pockets', kind: 'learned' })
    expect(mostSuccessfulStop(history, 'keys', 'Keys')).toEqual({ stopId: 'pockets', count: 2 })
    expect(trail.at(-1)?.id).toBe('slow-sweep')
  })

  it('puts safety guidance first for urgent medicine and missing cards', () => {
    expect(buildTrail('medicine', 'Medicine', { itemDetail: 'urgent' }, [])[0].id).toBe('safety-help')
    expect(buildTrail('money', 'Money', { itemDetail: 'card' }, [])[0].id).toBe('card-safety')
    expect(buildTrail('medicine', 'Medicine', { itemDetail: 'urgent' }, [], [{ ...savedHome, id: 'item:medicine', itemId: 'medicine', itemLabel: 'Medicine' }])[0].id).toBe('safety-help')
  })

  it('keeps actionable phone clues in the short trail ahead of an old saved home', () => {
    const phoneHome = { ...savedHome, id: 'item:phone', itemId: 'phone' as const, itemLabel: 'Phone' }
    const ringing = buildTrail('phone', 'Phone', { itemDetail: 'ring', lastPlace: 'home', lastAction: 'sat' }, [], [phoneHome])
    const dead = buildTrail('phone', 'Phone', { itemDetail: 'dead', lastPlace: 'home', lastAction: 'sat' }, [], [phoneHome])
    expect(ringing[0].id).toBe('ring-phone')
    expect(dead[0].id).toBe('chargers')
    expect(ringing[1].kind).toBe('home')
  })

  it('starts with the attached phone for a wallet and the current place before a past home', () => {
    const wallet = buildTrail('wallet', 'Wallet', { itemDetail: 'phone', lastPlace: 'work', lastAction: 'sat' }, [], [{ ...savedHome, id: 'item:wallet', itemId: 'wallet', itemLabel: 'Wallet' }])
    expect(wallet[0].id).toBe('attached-phone')
    expect(wallet.findIndex((stop) => stop.kind === 'home')).toBeGreaterThan(wallet.findIndex((stop) => stop.id === 'work'))
  })

  it('never repeats stops and always ends with a slow sweep', () => {
    const trail = buildTrail('wallet', 'Wallet', { itemDetail: 'pocket', lastPlace: 'car', lastAction: 'carried' }, [])
    expect(new Set(trail.map((stop) => stop.id)).size).toBe(trail.length)
    expect(getFocusedStops(trail)).toHaveLength(3)
    expect(getWiderStops(trail)).toHaveLength(3)
    expect(trail).toHaveLength(7)
    expect(trail.at(-1)?.id).toBe('slow-sweep')
  })

  it('keeps the visible route in two three-place passes', () => {
    const trail = buildTrail('keys', 'Keys', { itemDetail: 'car', lastPlace: 'home', lastAction: 'arrived' }, [])
    expect(getTrailStage(trail, 0)).toMatchObject({ name: 'focused', current: 1, total: 3 })
    expect(isFocusedPassComplete(trail, 2)).toBe(true)
    expect(getTrailStage(trail, 3)).toMatchObject({ name: 'wider', current: 1, total: 3 })
    expect(getTrailStage(trail, trail.length - 1)).toMatchObject({ name: 'final', current: 1, total: 1 })
  })

  it('moves an older long search safely into the focused route', () => {
    const oldStops = [
      ...Array.from({ length: 8 }, (_, index) => ({ id: `place-${index + 1}`, title: `Place ${index + 1}`, instruction: 'Check here.', spots: ['One spot'] })),
      { id: 'slow-sweep', title: 'Slow final sweep', instruction: 'Check slowly.', spots: ['Likeliest place'], kind: 'final' as const },
    ]
    const migrated = compactActiveSearch({
      version: 3,
      id: 'old-search',
      itemId: 'keys',
      itemLabel: 'Keys',
      answers: {},
      stops: oldStops,
      currentIndex: 7,
      checkedSpots: {},
      startedAt: '2026-09-21T12:00:00.000Z',
      lastUpdatedAt: '2026-09-21T12:05:00.000Z',
    })

    expect(migrated.stops).toHaveLength(7)
    expect(migrated.stops.at(-1)?.id).toBe('slow-sweep')
    expect(migrated.currentIndex).toBe(6)
  })

  it('offers current-stop and item suggestions without duplicates', () => {
    const trail = buildTrail('keys', 'Keys', {}, [])
    const suggestions = getFoundSuggestions('keys', trail[0])
    expect(new Set(suggestions).size).toBe(suggestions.length)
    expect(suggestions).not.toContain(trail[0].title)
    expect(suggestions[0]).toBe(trail[0].spots[0])
    expect(suggestions.length).toBeLessThanOrEqual(10)
  })
})
