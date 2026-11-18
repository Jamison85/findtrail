import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ONBOARDING_STORAGE_KEY } from './components/Onboarding'
import { DeviceFinderLinks } from './components/DeviceFinderLinks'
import { DEFAULT_SETTINGS, STORAGE_KEY, createActiveSearch } from './storage'
import { buildTrail, startFreshPass } from './trailEngine'
import type { ActiveSearch } from './types'

function seed(search: ActiveSearch) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, activeSearch: search, history: [], savedItems: [], settings: { ...DEFAULT_SETTINGS, motion: 'reduced' } }))
}

function saved(): ActiveSearch {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)!).activeSearch
}

const answers = { itemDetail: 'house', lastPlace: 'home', lastAction: 'arrived' }

describe('search improvements', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('starts with learned places after the item question without inventing answers', () => {
    const search = { ...createActiveSearch('keys', 'Keys'), answers: { itemDetail: 'house' }, resumeScreen: 'clues' as const }
    seed(search)
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    data.savedItems = [{ id: 'item:keys', itemId: 'keys', itemLabel: 'Keys', homeSpot: 'Blue bowl', pinned: false, createdAt: search.startedAt, updatedAt: search.startedAt }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start with likely places' }))
    expect(screen.getByRole('heading', { name: 'Its saved home' })).toBeInTheDocument()
    expect(saved().answers).toEqual({ itemDetail: 'house' })
    expect(saved().id).toBe(search.id)
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit clues' }))
    expect(screen.getByRole('heading', { name: 'Which keys are missing?' })).toBeInTheDocument()
  })

  it.each([
    ['medicine', 'urgent', 'Get backup while you search'],
    ['money', 'card', 'Protect the card'],
    ['phone', 'dead', 'Charging places'],
  ] as const)('keeps essential %s guidance on a quick start', (itemId, itemDetail, heading) => {
    seed({ ...createActiveSearch(itemId, itemId), answers: { itemDetail }, resumeScreen: 'clues' })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start with likely places' }))
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
    if (itemId === 'phone') expect(saved().stops.map((stop) => stop.id)).not.toContain('ring-phone')
  })

  it('requires the item question before offering a quick start', () => {
    seed(createActiveSearch('keys', 'Keys'))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    expect(screen.queryByRole('button', { name: 'Start with likely places' })).not.toBeInTheDocument()
  })

  it('keeps the selected activity and prior checks when starting from the last clue', () => {
    const stops = buildTrail('keys', 'Keys', answers, [])
    const search = { ...createActiveSearch('keys', 'Keys'), answers: { itemDetail: 'house', lastPlace: 'home' }, stops, resumeScreen: 'clues' as const, checkedSpots: { car: ['Driver-seat gap'] } }
    seed(search)
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: /Changed clothes/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Start with likely places' }))
    expect(saved().answers.lastAction).toBe('changed')
    expect(saved().checkedSpots).toEqual(search.checkedSpots)
    expect(screen.getByRole('heading', { name: 'Current and previous pockets' })).toBeInTheDocument()
  })

  it.each([
    [{ widenReady: true }, 'Your first pass is saved. Choose whether to search wider.', 'Pause before going wider.'],
    [{ resumeScreen: 'end' as const }, 'Your route is saved. Choose your next move.', 'Pause the search loop.'],
    [{ resumeScreen: 'clues' as const }, 'Your clues are saved. Finish them or start with what you know.', 'At home, what happened next?'],
  ])('describes the saved checkpoint instead of repeating the last area', (checkpoint, description, heading) => {
    seed({ ...createActiveSearch('keys', 'Keys'), answers, stops: buildTrail('keys', 'Keys', answers, []), currentIndex: 2, ...checkpoint })
    render(<App />)
    expect(screen.getByText(description)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('keeps checked spots when editing clues, including reloading midway through edits', () => {
    const search = { ...createActiveSearch('keys', 'Keys'), answers, stops: buildTrail('keys', 'Keys', answers, []), checkedSpots: { 'drop-zone': ['Entry table or hook'], car: ['Driver-seat gap'] } }
    seed(search)
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))
    fireEvent.click(screen.getByRole('button', { name: 'Edit clues' }))
    fireEvent.click(screen.getByRole('button', { name: 'House keys' }))
    expect(saved().checkedSpots).toEqual(search.checkedSpots)
    expect(saved().resumeScreen).toBe('clues')
    view.unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    expect(screen.getByRole('heading', { name: 'At home, what happened next?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Build my search trail' }))
    expect(saved().checkedSpots).toEqual(search.checkedSpots)
    expect(screen.getByRole('button', { name: /Entry table or hook/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers fresh places after a failed route and remembers both routes after reload', () => {
    const stops = buildTrail('keys', 'Keys', answers, [])
    const search = { ...createActiveSearch('keys', 'Keys'), answers, stops, currentIndex: stops.length - 1, checkedSpots: { 'drop-zone': ['Entry table or hook'] }, skippedStops: ['car'] }
    seed(search)
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Still missing · next steps' }))
    fireEvent.click(screen.getByRole('button', { name: 'Try new places' }))
    expect(saved().stops.filter((stop) => stop.kind !== 'final').every((stop) => !stops.some((old) => old.id === stop.id))).toBe(true)
    expect(saved().checkedSpots['drop-zone']).toEqual(['Entry table or hook'])
    const newStopId = saved().stops[0].id
    view.unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    expect(saved().stops[0].id).toBe(newStopId)
    expect(saved().previousStops?.map((stop) => stop.id)).toContain('car')
  })

  it('leaves irrelevant places out of a route and lets the user include them again', () => {
    seed({ ...createActiveSearch('keys', 'Keys'), answers, stops: buildTrail('keys', 'Keys', answers, []) })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))
    fireEvent.click(screen.getByRole('button', { name: 'This place doesn’t apply' }))
    expect(saved().excludedStopIds).toContain('drop-zone')
    expect(saved().stops.map((stop) => stop.id)).not.toContain('drop-zone')
    fireEvent.click(screen.getByRole('button', { name: 'Edit clues' }))
    fireEvent.click(screen.getByRole('button', { name: 'House keys' }))
    fireEvent.click(screen.getByRole('button', { name: /At home/ }))
    fireEvent.click(screen.getByText(/Places to leave out/))
    const options = screen.getByRole('group', { name: 'Places to leave out' })
    const excluded = within(options).getByRole('button', { name: /The landing zone/ })
    expect(excluded).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(excluded)
    fireEvent.click(screen.getByRole('button', { name: 'Build my search trail' }))
    expect(saved().stops.map((stop) => stop.id)).toContain('drop-zone')
  })

  it('records an already checked area without making the user tick each spot', () => {
    const stops = buildTrail('keys', 'Keys', answers, [])
    seed({ ...createActiveSearch('keys', 'Keys'), answers, stops })
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Search tools' }))
    fireEvent.click(screen.getByRole('button', { name: 'Already checked this whole area' }))
    expect(saved().checkedSpots[stops[0].id]).toEqual(stops[0].spots)
    expect(saved().currentIndex).toBe(1)
  })

  it('reopens a skipped place from an earlier pass, including after a reload', () => {
    const stops = buildTrail('keys', 'Keys', answers, [])
    const fresh = startFreshPass({ ...createActiveSearch('keys', 'Keys'), answers, stops, skippedStops: ['car'] }, [], [])
    seed({ ...fresh, currentIndex: fresh.stops.length - 1, resumeScreen: 'end' })
    const view = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'The car drop zones' }))
    expect(screen.getByRole('heading', { name: 'The car drop zones' })).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1')
    view.unmount()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: /Driver-seat gap/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Return to next moves' }))
    expect(screen.getByRole('heading', { name: 'Do one next move' })).toBeInTheDocument()
    expect(saved().checkedSpots.car).toEqual(['Driver-seat gap'])
    expect(saved().stops.at(-1)?.kind).toBe('final')
    expect(saved().resumeScreen).toBe('end')
  })

  it('offers official phone finders in separate tabs', () => {
    render(<DeviceFinderLinks />)
    const apple = screen.getByRole('link', { name: /Apple Find My/ })
    const google = screen.getByRole('link', { name: /Google Find Hub/ })
    expect(apple).toHaveAttribute('href', 'https://www.icloud.com/find')
    expect(google).toHaveAttribute('href', 'https://www.google.com/android/find')
    for (const link of [apple, google]) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })
})
