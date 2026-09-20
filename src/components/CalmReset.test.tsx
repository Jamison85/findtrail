import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalmReset } from './CalmReset'

describe('CalmReset', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('guides three ten-second breaths with a four-in six-out rhythm and can restart', () => {
    vi.useFakeTimers()
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    render(<CalmReset hasSearch motion="reduced" onResume={() => undefined} />)
    expect(document.querySelector('.horizon-ripples')).toBeInTheDocument()
    expect(document.querySelector('.calm-background')).not.toBeInTheDocument()
    expect(document.querySelector('.calm-feather')?.getAttribute('src')).toContain('findtrail-natural-feather-v2.webp')
    expect(screen.getByText('Breathe in')).toBeInTheDocument()
    expect(screen.getByLabelText('Breath 1 of 3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.queryByText('Optional sound')).not.toBeInTheDocument()

    now = 4_100
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getByText('Breathe out')).toBeInTheDocument()

    now = 20_100
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getByLabelText('Breath 3 of 3')).toBeInTheDocument()

    now = 30_000
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getByText('Three breaths complete')).toBeInTheDocument()
    expect(screen.getByText('Ready when you are')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume with clear eyes/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.getByText('Breathe in')).toBeInTheDocument()
    expect(screen.getByLabelText('Breath 1 of 3')).toBeInTheDocument()
  })
})