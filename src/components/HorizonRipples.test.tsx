import { render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HorizonRipples } from './HorizonRipples'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('reset water playback', () => {
  it('waits for the landing, follows each impact, and stops after the final wave', () => {
    let frame: FrameRequestCallback = () => undefined
    const request = vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 })
    vi.stubGlobal('requestAnimationFrame', request)
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container, unmount } = render(<HorizonRipples reducedMotion={false} startedAt={0} />)
    const video = container.querySelector('video')!
    Object.defineProperty(video, 'readyState', { value: 4 })

    frame(11_100)
    expect(play).not.toHaveBeenCalled()
    expect(video.style.opacity).toBe('0')
    frame(11_200)
    expect(play).toHaveBeenCalledOnce()
    expect(video.currentTime).toBe(0)
    expect(video.style.opacity).toBe('1')
    frame(21_300)
    expect(video.style.opacity).toBe('0')
    frame(22_200)
    expect(video.style.opacity).toBe('0')
    frame(23_300)
    expect(video.currentTime).toBeCloseTo(.1)
    expect(video.style.opacity).toBe('1')
    frame(33_300)
    expect(video.style.opacity).toBe('0')
    frame(34_200)
    expect(video.style.opacity).toBe('0')
    frame(35_400)
    expect(video.currentTime).toBeCloseTo(.2)
    expect(video.style.opacity).toBe('1')
    frame(45_200)
    expect(pause).toHaveBeenCalled()
    expect(video.style.opacity).toBe('0')
    unmount()
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1)
  })

  it('keeps the lake still before Begin and with reduced motion', () => {
    const request = vi.fn()
    vi.stubGlobal('requestAnimationFrame', request)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { rerender, container, unmount } = render(<HorizonRipples reducedMotion={false} startedAt={null} />)
    expect(request).not.toHaveBeenCalled()
    rerender(<HorizonRipples reducedMotion startedAt={0} />)
    expect(request).not.toHaveBeenCalled()
    expect(play).not.toHaveBeenCalled()
    expect(container.querySelector('video')).toHaveAttribute('preload', 'none')
    unmount()
  })

  it('waits for the feather animation when its visual start lags behind Begin', () => {
    let frame: FrameRequestCallback = () => undefined
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => { frame = callback; return 1 }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const { container, unmount } = render(<div>
      <div className="calm-feather-anchor" />
      <HorizonRipples reducedMotion={false} startedAt={0} />
    </div>)
    const feather = container.querySelector<HTMLElement>('.calm-feather-anchor')!
    const video = container.querySelector('video')!
    Object.defineProperty(video, 'readyState', { value: 4 })
    feather.getAnimations = vi.fn(() => [{ animationName: 'calm-feather-lift', startTime: 1_000 } as CSSAnimation])

    frame(11_200)
    expect(play).not.toHaveBeenCalled()
    expect(video.style.opacity).toBe('0')
    frame(12_200)
    expect(play).toHaveBeenCalledOnce()
    expect(video.currentTime).toBe(0)
    expect(video.style.opacity).toBe('1')
    unmount()
  })
})
