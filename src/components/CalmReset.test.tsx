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
    expect(screen.getAllByText('Breathe in').length).toBeGreaterThan(0)
    expect(screen.getByText('Breath 1 of 3')).toBeInTheDocument()
    expect(screen.getByLabelText('Breathing rhythm: four seconds in, six seconds out')).toBeInTheDocument()
    expect(screen.queryByText('Optional sound')).not.toBeInTheDocument()

    now = 4_100
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getAllByText('Breathe out').length).toBeGreaterThan(0)

    now = 20_100
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getByText('Breath 3 of 3')).toBeInTheDocument()

    now = 30_000
    act(() => vi.advanceTimersByTime(100))
    expect(screen.getAllByText('Reset complete').length).toBeGreaterThan(0)
    expect(screen.getByText('Ready when you are')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /resume with clear eyes/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    expect(screen.getAllByText('Breathe in').length).toBeGreaterThan(0)
    expect(screen.getByText('Breath 1 of 3')).toBeInTheDocument()
  })
})
