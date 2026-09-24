import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActiveSearch, Settings } from '../types'
import { TrailView } from './TrailView'

const search: ActiveSearch = {
  version: 3,
  id: 'active-trail-test',
  itemId: 'keys',
  itemLabel: 'Keys',
  answers: {},
  stops: [
    { id: 'entry', title: 'The landing zone', instruction: 'Check where your hands unloaded.', spots: ['Entry hook', 'Shoe shelf'] },
    { id: 'pockets', title: 'Current pockets', instruction: 'Check each pocket.', spots: ['Current pants'] },
  ],
  currentIndex: 0,
  checkedSpots: {},
  startedAt: '2026-09-20T12:00:00.000Z',
  lastUpdatedAt: '2026-09-20T12:00:00.000Z',
}

const settings: Settings = {
  motion: 'full',
  textSize: 'standard',
  speakSteps: false,
  calmPause: false,
}

function renderTrail(onNext = vi.fn(), activeSearch = search) {
  render(<TrailView
    search={activeSearch}
    settings={settings}
    offerReset={false}
    onDismissReset={() => undefined}
    onBack={() => undefined}
    onToggleSpot={() => undefined}
    onNext={onNext}
    onFound={() => undefined}
    onCalm={() => undefined}
    onEditClues={() => undefined}
  />)
  return onNext
}

describe('TrailView', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('makes the current destination and assistance controls explicit', () => {
    renderTrail()
    expect(screen.getByRole('heading', { name: 'The landing zone' })).toHaveFocus()
    expect(screen.getByRole('progressbar', { name: 'Focused pass progress' })).toHaveAttribute('aria-valuetext', 'Place 1 of 2 in the focused pass')
    expect(screen.getByRole('group', { name: 'Places to check at The landing zone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hands-free voice commands are unavailable in this browser' })).toBeDisabled()
    expect(screen.getByText(/Sneaky little side quest\./)).toBeInTheDocument()
    expect(screen.queryByText(/Sneaky bastard\./)).not.toBeInTheDocument()
  })

  it('gives the next stop a short visual handoff before advancing', () => {
    vi.useFakeTimers()
    const onNext = renderTrail()

    fireEvent.click(screen.getByRole('button', { name: 'Skip this place' }))
    expect(onNext).not.toHaveBeenCalled()
    expect(document.querySelector('.stop-card')).toHaveClass('is-departing')

    act(() => vi.advanceTimersByTime(190))
    expect(onNext).toHaveBeenCalledWith(true)
  })

  it('finishes the focused pass without exposing the full route at once', () => {
    const stagedSearch: ActiveSearch = {
      ...search,
      stops: [
        ...search.stops,
        { id: 'counter', title: 'Flat surfaces', instruction: 'Check surfaces.', spots: ['Counter'] },
        { id: 'car', title: 'The car', instruction: 'Check the car.', spots: ['Console'] },
        { id: 'bag', title: 'Bags', instruction: 'Check bags.', spots: ['Work bag'] },
        { id: 'seat', title: 'Seating', instruction: 'Check seating.', spots: ['Couch'] },
        { id: 'slow-sweep', title: 'Slow final sweep', instruction: 'Check slowly.', spots: ['Likeliest place'], kind: 'final' },
      ],
      currentIndex: 2,
    }

    renderTrail(vi.fn(), stagedSearch)

    expect(screen.getByText('Place 3 of 3')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Focused pass progress' })).toHaveAttribute('aria-valuenow', '3')
    expect(screen.getByRole('button', { name: 'Continue to wider search' })).toBeInTheDocument()
    expect(screen.queryByText('Place 3 of 6')).not.toBeInTheDocument()
  })
})
