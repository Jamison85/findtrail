import { useEffect, useRef } from 'react'
import { CONTACT_SECONDS, CYCLE_SECONDS, RESET_CYCLES } from './resetTiming'

interface HorizonRipplesProps {
  reducedMotion: boolean
  startedAt: number | null
}

const WATER_IMAGE = `${import.meta.env.BASE_URL}findtrail-reset-lake.webp`
const WATER_VIDEO = `${import.meta.env.BASE_URL}findtrail-water-impact.mp4`
const WATER_VIDEO_SECONDS = 10
const LAST_WAVE_END = CONTACT_SECONDS + CYCLE_SECONDS * (RESET_CYCLES - 1) + WATER_VIDEO_SECONDS

export function HorizonRipples({ reducedMotion, startedAt }: HorizonRipplesProps) {
  const sceneRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    const alignContact = () => {
      const { width, height } = scene.getBoundingClientRect()
      // The video and poster use the same cover crop. Keep the feather tip on
      // their impact point when a phone, browser toolbar, or window resizes.
      const scale = Math.max(width / 1080, height / 1920)
      const contactY = (height - 1920 * scale) / 2 + 1920 * scale * .64
      scene.parentElement?.style.setProperty('--water-touch-y', `${contactY}px`)
    }
    alignContact()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(alignContact)
    observer.observe(scene)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const scene = sceneRef.current
    const video = videoRef.current
    if (!scene || !video) return
    video.muted = true
    video.style.opacity = '0'
    if (reducedMotion || startedAt === null) return

    let frame = 0
    let lastCycle = -1
    let lastCheck = 0
    let playPending = false
    let cancelled = false
    let feather: HTMLElement | null = null
    let lift: Animation | null = null

    const sync = (now: number) => {
      if (cancelled) return
      feather ??= scene.parentElement?.querySelector<HTMLElement>('.calm-feather-anchor') ?? null
      let clockStart = startedAt
      if (feather && typeof feather.getAnimations === 'function') {
        // The feather's CSS animation can begin after the click that sets
        // startedAt. Use its actual timeline so the water never leads the tip.
        lift ??= feather.getAnimations().find(animation =>
          'animationName' in animation && String(animation.animationName).startsWith('calm-feather-lift')) ?? null
        if (!lift || typeof lift.startTime !== 'number') {
          frame = requestAnimationFrame(sync)
          return
        }
        clockStart = lift.startTime
      }
      const elapsed = (now - clockStart) / 1000
      if (elapsed >= LAST_WAVE_END) {
        video.pause()
        video.style.opacity = '0'
        return
      }
      if (now - lastCheck >= 80) {
        lastCheck = now
        if (document.hidden || elapsed < CONTACT_SECONDS) {
          if (!video.paused) video.pause()
        } else if (video.readyState >= 2) {
          const cycle = Math.min(RESET_CYCLES - 1, Math.floor((elapsed - CONTACT_SECONDS) / CYCLE_SECONDS))
          const age = elapsed - CONTACT_SECONDS - cycle * CYCLE_SECONDS
          if (cycle !== lastCycle || Math.abs(video.currentTime - age) > .35) {
            video.currentTime = age
            lastCycle = cycle
          }
          video.style.opacity = '1'
          if (video.paused && !playPending) {
            playPending = true
            void video.play().catch(() => {
              // A blocked media policy retains the original quiet lake.
              video.style.opacity = '0'
            }).finally(() => { playPending = false })
          }
        }
      }
      frame = requestAnimationFrame(sync)
    }
    frame = requestAnimationFrame(sync)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      video.pause()
      video.style.opacity = '0'
    }
  }, [reducedMotion, startedAt])

  return (
    <div ref={sceneRef} className="horizon-ripples" style={{ backgroundImage: `url(${WATER_IMAGE})` }} aria-hidden="true">
      <video ref={videoRef} className="horizon-ripples__water" src={WATER_VIDEO} poster={WATER_IMAGE} muted playsInline preload={reducedMotion ? 'none' : 'auto'} disablePictureInPicture tabIndex={-1} />
    </div>
  )
}
