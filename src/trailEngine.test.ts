import { describe, expect, it } from 'vitest'
import { buildTrail, getFoundSuggestions, mostLikelyLocation, mostSuccessfulStop } from './trailEngine'
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

  it('never repeats stops and always ends with a slow sweep', () => {
    const trail = buildTrail('wallet', 'Wallet', { itemDetail: 'pocket', lastPlace: 'car', lastAction: 'carried' }, [])
    expect(new Set(trail.map((stop) => stop.id)).size).toBe(trail.length)
    expect(trail.at(-1)?.id).toBe('slow-sweep')
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
