import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalmReset } from './CalmReset'

describe('CalmReset', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('guides the reset without repeating the breath instructions in the footer', () => {
    vi.useFakeTimers()
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)

    render(<CalmReset hasSearch motion="reduced" onResume={() => undefined} />)
    expect(document.querySelector('.horizon-ripples')).toBeInTheDocument()
    expect(document.querySelector('.calm-feather')?.getAttribute('src')).toContain('findtrail-natural-feather-v2.webp')
    expect(document.querySelector('.calm-feather-anchor')).toBeInTheDocument()
    expect(screen.getByText('Breathe in as it rises, out as it falls.')).toBeInTheDocument()
    expect(document.querySelector('.calm-guidance__phase')).toHaveTextContent('Follow the feather')
    expect(screen.queryByRole('progressbar', { name: 'Mental reset progress' })).not.toBeInTheDocument()
    now = 20_000
    act(() => vi.advanceTimersByTime(20_000))
    expect(document.querySelector('.calm-guidance__phase')).toHaveTextContent('Follow the feather')
    fireEvent.click(screen.getByRole('button', { name: /begin 30-second reset/i }))
    expect(document.querySelector('.calm-guidance__phase')).toHaveTextContent('Breathe in')
    expect(screen.getByRole('progressbar', { name: 'Mental reset progress' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.queryByText('4 in · 6 out rhythm')).not.toBeInTheDocument()
    expect(screen.queryByText(/Cycle 1 of 3/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Breathe comfortably. Never force the pace.')).not.toBeInTheDocument()

    now = 24_100
    act(() => vi.advanceTimersByTime(100))
    expect(document.querySelector('.calm-guidance__phase')).toHaveTextContent('Breathe out')
    expect(screen.getByText('Drift down with it')).toBeInTheDocument()

    now = 50_000
    act(() => vi.advanceTimersByTime(100))
    expect(document.querySelector('.calm-guidance__phase')).toHaveTextContent('Reset complete')
    expect(screen.getByRole('progressbar', { name: 'Mental reset progress' })).toHaveAttribute('aria-valuenow', '30')
    expect(screen.getByRole('button', { name: /return to my trail/i })).toBeInTheDocument()
  })
})
