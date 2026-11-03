import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalmReset } from './CalmReset'
import type { ActiveSearch } from '../types'

const search: ActiveSearch = {
  version: 3, id: 'keys-1', itemId: 'keys', itemLabel: 'Keys',
  answers: {}, currentIndex: 0, checkedSpots: { landing: ['Coat pocket'] },
  stops: [{ id: 'landing', title: 'The landing zone', instruction: 'Check where your hands unloaded.', spots: ['Coat pocket', 'Beside the door'] }],
  startedAt: '2026-11-02T08:00:00Z', lastUpdatedAt: '2026-11-02T08:01:00Z',
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('FindTrail CLEAR', () => {
  it('replaces the feather with a continuous photographic scene and actual next unchecked place', () => {
    const resume = vi.fn()
    const before = JSON.stringify(search)
    render(<CalmReset search={search} returnScreen="trail" motion="reduced" onResume={resume} onBegin={() => undefined} />)
    expect(document.querySelector('.clear-scene')).toBeInTheDocument()
    expect(document.querySelector('.calm-feather')).not.toBeInTheDocument()
    expect(screen.getByText('The landing zone')).toBeInTheDocument()
    expect(screen.getByText('Beside the door')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'One place. One useful step.', level: 1 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Return to this place' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Return to this place' }))
    expect(resume).toHaveBeenCalledOnce()
    expect(JSON.stringify(search)).toBe(before)
  })

  it('offers immediate return, manual focus and optional breathing without another primary action', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const resume = vi.fn()
    render(<CalmReset search={search} returnScreen="trail" motion="full" onResume={resume} onBegin={() => undefined} />)
    expect(screen.getByRole('heading', { name: /You haven't lost your place/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to search/i })).toHaveAccessibleDescription('Your search progress stays unchanged.')
    expect(screen.queryByRole('button', { name: 'Return to this place' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Optional breathing cue' }))
    expect(screen.getByText(/Breathe gently in/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /I'm ready for one step/i }))
    expect(screen.getByRole('button', { name: 'Return to this place' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /I'm ready for one step/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Back to search/i }))
    expect(resume).toHaveBeenCalledOnce()
  })

  it('progresses automatically while visible, but cannot advance while hidden', () => {
    vi.useFakeTimers()
    let hidden = false
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden)
    render(<CalmReset search={search} returnScreen="trail" motion="full" onResume={() => undefined} onBegin={() => undefined} />)
    act(() => vi.advanceTimersByTime(2000))
    expect(screen.queryByRole('button', { name: 'Return to this place' })).not.toBeInTheDocument()
    hidden = true
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(12000))
    expect(screen.queryByRole('button', { name: 'Return to this place' })).not.toBeInTheDocument()
    hidden = false
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    act(() => vi.advanceTimersByTime(4000))
    expect(screen.getByRole('button', { name: 'Return to this place' })).toBeInTheDocument()
  })

  it('provides the no-search fallback without inventing a location', () => {
    const begin = vi.fn()
    render(<CalmReset search={null} returnScreen="home" motion="reduced" onResume={() => undefined} onBegin={begin} />)
    expect(screen.getByText('One thing to find.')).toBeInTheDocument()
    expect(screen.queryByText('Beside the door')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to home/i })).toHaveAccessibleDescription('Return to the FindTrail home screen.')
    fireEvent.click(screen.getByRole('button', { name: 'Begin a search' }))
    expect(begin).toHaveBeenCalledOnce()
  })
})
