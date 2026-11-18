import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ActiveSearch } from '../types'
import { CalmReset } from './CalmReset'

const search: ActiveSearch = {
  version: 3, id: 'reset-test', itemId: 'keys', itemLabel: 'Keys', answers: {},
  stops: [{ id: 'entry', title: 'The landing zone', instruction: 'Look where you set things down.', spots: ['Entry hook', 'Shoe shelf'] }],
  currentIndex: 0, checkedSpots: { entry: ['Entry hook'] },
  startedAt: '2026-11-18T12:00:00.000Z', lastUpdatedAt: '2026-11-18T12:00:00.000Z',
}

describe('CalmReset', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it('reveals the next unchecked spot and returns without changing the search', () => {
    vi.useFakeTimers()
    const resume = vi.fn()
    const original = JSON.stringify(search)
    render(<CalmReset search={search} returnScreen="trail" motion="full" onResume={resume} onBegin={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'You haven’t lost your place.' })).toBeInTheDocument()
    expect(screen.queryByText('Shoe shelf')).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(4200))
    expect(screen.getByText('Shoe shelf')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Return to this place' }))
    expect(resume).toHaveBeenCalledOnce()
    expect(JSON.stringify(search)).toBe(original)
  })

  it('offers the next step immediately with reduced motion and a way to begin without a search', () => {
    const begin = vi.fn()
    render(<CalmReset search={null} returnScreen="home" motion="reduced" onResume={vi.fn()} onBegin={begin} />)
    expect(screen.getByText('One thing to find.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Optional breathing cue' }))
    expect(screen.getByText(/There is no pace to keep/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Begin a search' }))
    expect(begin).toHaveBeenCalledOnce()
  })

  it('lets someone reveal the step without waiting for the transition', () => {
    vi.useFakeTimers()
    render(<CalmReset search={search} returnScreen="trail" motion="full" onResume={vi.fn()} onBegin={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /I’m ready for one step/ }))
    expect(screen.getByText('Shoe shelf')).toBeInTheDocument()
  })
})
