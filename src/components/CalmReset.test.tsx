import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveSearch } from '../types'
import { CalmReset } from './CalmReset'

const search: ActiveSearch = {
  version: 3, id: 'reset-test', itemId: 'keys', itemLabel: 'Keys', answers: {},
  stops: [{ id: 'entry', title: 'The landing zone', instruction: 'Look where you set things down.', spots: ['Entry hook', 'Shoe shelf'] }],
  currentIndex: 0, checkedSpots: { entry: ['Entry hook'] },
  startedAt: '2026-11-18T12:00:00.000Z', lastUpdatedAt: '2026-11-18T12:00:00.000Z',
}

describe('CalmReset', () => {
  it('shows the next unchecked spot and lets you return immediately', () => {
    const resume = vi.fn()
    const original = JSON.stringify(search)
    render(<CalmReset search={search} returnScreen="trail" onResume={resume} />)
    expect(screen.getByRole('heading', { name: 'Take a moment.' })).toBeInTheDocument()
    expect(screen.getByText('Shoe shelf')).toBeVisible()
    expect(screen.queryByText('Entry hook')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Back to search' }))
    expect(resume).toHaveBeenCalledOnce()
    expect(JSON.stringify(search)).toBe(original)
  })

  it('shows an optional breathing cue and a home exit without a search', () => {
    const resume = vi.fn()
    render(<CalmReset search={null} returnScreen="home" onResume={resume} />)
    expect(screen.queryByText('Your search is saved.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start breathing' }))
    expect(screen.getByRole('status')).toHaveTextContent('Breathe in')
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(resume).toHaveBeenCalledOnce()
  })

  it('holds after each inhale and goes straight from the exhale into the next breath', () => {
    vi.useFakeTimers()
    try {
      const view = render(<CalmReset search={search} returnScreen="trail" onResume={vi.fn()} />)
      const lake = view.container.querySelector('.reset-journey__water--fallback')
      const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
      fireEvent.click(screen.getByRole('button', { name: 'Start breathing' }))
      advance(1000)
      expect(lake).toHaveAttribute('data-motion-phase', 'inhale')
      fireEvent.click(screen.getByRole('button', { name: 'Pause breathing' }))
      advance(15000)
      expect(screen.getByRole('status')).toHaveTextContent('Breathing paused')
      expect(lake).toHaveAttribute('data-motion-phase', 'inhale')
      fireEvent.click(screen.getByRole('button', { name: 'Resume breathing' }))
      advance(5100)
      expect(screen.getByRole('status')).toHaveTextContent('Hold gently')
      expect(lake).toHaveAttribute('data-motion-phase', 'hold')
      advance(2000)
      expect(screen.getByRole('status')).toHaveTextContent('Breathe out')
      expect(lake).toHaveAttribute('data-motion-phase', 'exhale')
      advance(8000)
      expect(screen.getByRole('status')).toHaveTextContent('Breathe in')
      expect(lake).toHaveAttribute('data-motion-phase', 'inhale')
      advance(24000)
      expect(lake).toHaveAttribute('data-motion-phase', 'exhale')
      advance(8000)
      expect(screen.getByRole('status')).toHaveTextContent('Reset complete')
      expect(lake).toHaveAttribute('data-motion-phase', 'tail')
      advance(1400)
      expect(lake).not.toHaveAttribute('data-motion-phase')
      expect(screen.getByRole('button', { name: 'Breathe again' })).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })
})
