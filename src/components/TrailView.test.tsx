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

function renderTrail(onNext = vi.fn()) {
  render(<TrailView
    search={search}
    settings={settings}
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
    expect(screen.getByRole('progressbar', { name: 'Search trail progress' })).toHaveAttribute('aria-valuetext', 'Stop 1 of 2')
    expect(screen.getByRole('group', { name: 'Places to check at The landing zone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Read aloud' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hands-free voice commands are unavailable in this browser' })).toBeDisabled()
  })

  it('gives the next stop a short visual handoff before advancing', () => {
    vi.useFakeTimers()
    const onNext = renderTrail()

    fireEvent.click(screen.getByRole('button', { name: 'Nothing here · next place' }))
    expect(onNext).not.toHaveBeenCalled()
    expect(document.querySelector('.stop-card')).toHaveClass('is-departing')

    act(() => vi.advanceTimersByTime(190))
    expect(onNext).toHaveBeenCalledOnce()
  })
})
