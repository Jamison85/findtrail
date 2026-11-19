import { act, fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveSearch } from '../types'
import { CalmReset } from './CalmReset'
import { lakeFog } from './breathingLake'

const search: ActiveSearch = {
  version: 3, id: 'reset-test', itemId: 'keys', itemLabel: 'Keys', answers: {},
  stops: [{ id: 'entry', title: 'The landing zone', instruction: 'Look where you set things down.', spots: ['Entry hook', 'Shoe shelf'] }],
  currentIndex: 0, checkedSpots: { entry: ['Entry hook'] },
  startedAt: '2026-11-18T12:00:00.000Z', lastUpdatedAt: '2026-11-18T12:00:00.000Z',
}

describe('CalmReset', () => {
  it('gathers the released fog into the next inhale without a jump', () => {
    const heldFog = lakeFog('hold', 0)
    expect(lakeFog('inhale', 1)).toEqual(heldFog)
    expect(lakeFog('exhale', 0)).toEqual(heldFog)
    expect(lakeFog('exhale', 1)).toEqual(lakeFog('inhale', 0))
    expect(heldFog.amount).toBeGreaterThan(lakeFog('inhale', .65).amount * .72)
    expect(heldFog.amount - lakeFog('exhale', .10).amount).toBeLessThan(.08)
    expect(lakeFog('exhale', .25).amount).toBeLessThan(heldFog.amount)
    expect(lakeFog('exhale', .75).amount).toBeLessThan(lakeFog('exhale', .25).amount)
    expect(lakeFog('exhale', .25).amount).toBeGreaterThan(lakeFog('exhale', 1).amount)
    expect(lakeFog('inhale', .5).sway).toBeGreaterThan(0)
    expect(lakeFog('exhale', .5).sway).toBeLessThan(0)
    expect(lakeFog('inhale', .75).height).toBeGreaterThan(lakeFog('inhale', .25).height)
    expect(lakeFog('inhale', .75).lift).toBeGreaterThan(lakeFog('inhale', .25).lift)
    expect(lakeFog('exhale', .75).height).toBeLessThan(lakeFog('exhale', .25).height)
    expect(lakeFog('exhale', .75).lift).toBeLessThan(lakeFog('exhale', .25).lift)
  })

  it('keeps both exits available while leaving the trail saved', () => {
    const resume = vi.fn()
    const home = vi.fn()
    const original = JSON.stringify(search)
    render(<CalmReset search={search} returnScreen="trail" onResume={resume} onHome={home} />)
    expect(screen.getByRole('heading', { name: 'Take a moment.' })).toBeInTheDocument()
    expect(screen.getByText('3 slow breaths.')).toBeVisible()
    expect(screen.queryByText('Shoe shelf')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start breathing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(resume).toHaveBeenCalledOnce()
    expect(home).toHaveBeenCalledOnce()
    expect(JSON.stringify(search)).toBe(original)
  })

  it('shows an optional breathing cue and a home exit without a search', () => {
    const home = vi.fn()
    render(<CalmReset search={null} returnScreen="home" onResume={vi.fn()} onHome={home} />)
    expect(screen.queryByText('Your search is saved.')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start breathing' }))
    expect(screen.getByRole('status')).toHaveTextContent('Breathe in')
    fireEvent.click(screen.getByRole('button', { name: 'Back to home' }))
    expect(home).toHaveBeenCalledOnce()
  })

  it('holds after each inhale and goes straight from the exhale into the next breath', () => {
    vi.useFakeTimers()
    try {
      const view = render(<CalmReset search={search} returnScreen="trail" onResume={vi.fn()} onHome={vi.fn()} />)
      const lake = view.container.querySelector('.reset-journey__water--fallback')
      const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms))
      fireEvent.click(screen.getByRole('button', { name: 'Start breathing' }))
      expect(screen.getByRole('status')).toHaveTextContent('Breath 1 of 3')
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
      expect(screen.getByRole('status')).toHaveTextContent('Breath 2 of 3')
      expect(lake).toHaveAttribute('data-motion-phase', 'inhale')
      advance(16000)
      expect(screen.getByRole('status')).toHaveTextContent('Breath 3 of 3')
      expect(screen.queryByText('Shoe shelf')).not.toBeInTheDocument()
      advance(8000)
      expect(lake).toHaveAttribute('data-motion-phase', 'exhale')
      advance(8000)
      expect(screen.getByRole('status')).toHaveTextContent('Reset complete')
      expect(screen.getByRole('status')).toHaveTextContent('One spot at a time.')
      expect(screen.getByText('Shoe shelf')).toBeVisible()
      expect(screen.queryByText('Entry hook')).not.toBeInTheDocument()
      expect(lake).toHaveAttribute('data-motion-phase', 'tail')
      advance(1400)
      expect(lake).not.toHaveAttribute('data-motion-phase')
      expect(screen.getByRole('button', { name: 'Breathe again' })).toBeEnabled()
    } finally {
      vi.useRealTimers()
    }
  })
})
