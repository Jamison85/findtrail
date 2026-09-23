import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IOSInstallCoach } from './IOSInstallCoach'

const originalUserAgent = navigator.userAgent
const originalPlatform = navigator.platform

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.clear()
  Object.defineProperty(navigator, 'userAgent', { value: originalUserAgent, configurable: true })
  Object.defineProperty(navigator, 'platform', { value: originalPlatform, configurable: true })
})

describe('IOSInstallCoach', () => {
  it('shows first-visit Home Screen instructions on iPhone and remembers that it was shown', () => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1', configurable: true })
    Object.defineProperty(navigator, 'platform', { value: 'iPhone', configurable: true })

    const first = render(<IOSInstallCoach />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(900))

    expect(screen.getByRole('heading', { name: 'Add FindTrail to your Home Screen' })).toBeInTheDocument()
    expect(screen.getByText('Choose “Add to Home Screen”')).toBeInTheDocument()
    expect(window.localStorage.getItem('findtrail:ios-install-coach-seen-v1')).toBe('1')

    fireEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    first.unmount()

    render(<IOSInstallCoach />)
    act(() => vi.advanceTimersByTime(900))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reopens the instructions when Settings explicitly requests them', () => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 Version/26.0 Mobile/15E148 Safari/604.1', configurable: true })
    Object.defineProperty(navigator, 'platform', { value: 'iPhone', configurable: true })
    window.localStorage.setItem('findtrail:ios-install-coach-seen-v1', '1')

    const view = render(<IOSInstallCoach requestKey={0} />)
    act(() => vi.advanceTimersByTime(900))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    view.rerender(<IOSInstallCoach requestKey={1} />)
    expect(screen.getByRole('heading', { name: 'Add FindTrail to your Home Screen' })).toBeInTheDocument()
  })

  it('does not interrupt non-iOS browsers', () => {
    vi.useFakeTimers()
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140 Safari/537.36', configurable: true })
    Object.defineProperty(navigator, 'platform', { value: 'Linux x86_64', configurable: true })

    render(<IOSInstallCoach />)
    act(() => vi.advanceTimersByTime(900))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
