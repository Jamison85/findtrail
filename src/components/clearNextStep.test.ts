import { describe, expect, it } from 'vitest'
import { clearNextStep } from './clearNextStep'
import type { ActiveSearch } from '../types'

const sample: ActiveSearch = {
  version: 3, id: 'search-1', itemId: 'keys', itemLabel: 'Keys',
  answers: {}, currentIndex: 0,
  stops: [{ id: 'door', title: 'The landing zone', instruction: 'Look where your hands unloaded.', spots: ['Beside the door', 'Entryway table'] }],
  checkedSpots: { door: ['Beside the door'] },
  startedAt: '2026-10-29T12:00:00Z',
  lastUpdatedAt: '2026-10-29T12:01:00Z',
}

describe('CLEAR uses the real search without changing it', () => {
  it('projects only the next unchecked spot of the current stop', () => {
    const before = JSON.stringify(sample)
    const next = clearNextStep(sample, 'trail')
    expect(next.kind).toBe('place')
    expect(next.title).toBe('The landing zone')
    expect(next.spot).toBe('Entryway table')
    expect(next.instruction).toBe('Look where your hands unloaded.')
    expect(JSON.stringify(sample)).toBe(before)
  })

  it('does not fabricate a next spot once the current area is checked', () => {
    const search = { ...sample, checkedSpots: { door: ['Beside the door', 'Entryway table'] } }
    expect(clearNextStep(search, 'trail').kind).toBe('continue')
    expect(clearNextStep(search, 'trail').spot).toBeUndefined()
  })

  it('preserves safety priority and original instruction', () => {
    const search = { ...sample, stops: [{ id: 'safety-help', title: 'Safety first', kind: 'safety' as const, instruction: 'Contact help now.', spots: ['Call for help'] }], checkedSpots: {} }
    expect(clearNextStep(search, 'trail')).toMatchObject({ kind: 'safety', title: 'Safety first', instruction: 'Contact help now.', spot: 'Call for help', buttonLabel: 'Continue safely' })
  })

  it('does not recommend a made-up place while clues, widening, or recovery are active', () => {
    for (const origin of ['clues', 'widen', 'end', 'home'] as const) {
      const next = clearNextStep(sample, origin)
      expect(next.kind).toBe('continue')
      expect(next.spot).toBeUndefined()
    }
    expect(clearNextStep({ ...sample, foundDraft: { location: 'Blue bowl', returnScreen: 'trail', foundInCurrentArea: true, saveAsHome: false, pinCustomItem: false } }, 'trail').kind).toBe('continue')
  })

  it('does not override excluded, skipped, or complete stops', () => {
    expect(clearNextStep({ ...sample, excludedStopIds: ['door'] }, 'trail').spot).toBeUndefined()
    expect(clearNextStep({ ...sample, skippedStops: ['door'] }, 'trail').spot).toBeUndefined()
    expect(clearNextStep({ ...sample, stops: [{ ...sample.stops[0], kind: 'final' }] }, 'trail').spot).toBeUndefined()
  })

  it('offers the existing starting flow if no search is in progress', () => {
    expect(clearNextStep(null, 'home')).toMatchObject({ kind: 'new', buttonLabel: 'Begin a search' })
  })
})
