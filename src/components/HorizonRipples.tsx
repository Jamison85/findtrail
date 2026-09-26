import { useEffect, useRef, useState } from 'react'

interface HorizonRipplesProps {
  reducedMotion: boolean
  startedAt: number | null
}

const WATER_IMAGE = `${import.meta.env.BASE_URL}findtrail-reset-lake.webp`
const WATER_VIDEO = `${import.meta.env.BASE_URL}findtrail-reset-water.mp4`
// The wave appears about 1.5 seconds into the clip. It meets the feather as
// the feather settles onto the lake during the exhale.
const VIDEO_START_SECONDS = 5.6
const RESET_SECONDS = 30

export function HorizonRipples({ reducedMotion, startedAt }: HorizonRipplesProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || reducedMotion || startedAt === null) {
      video?.pause()
      return
    }

    let startTimer = 0
    let stopTimer = 0
    let cancelled = false

    function syncPlayback() {
      if (!video || cancelled || document.hidden) return
      window.clearTimeout(startTimer)
      const elapsed = (performance.now() - startedAt!) / 1000
      if (elapsed >= RESET_SECONDS) {
        setActive(false)
        video.pause()
        return
      }
      if (elapsed < VIDEO_START_SECONDS) {
        startTimer = window.setTimeout(syncPlayback, (VIDEO_START_SECONDS - elapsed) * 1000)
        return
      }

      if (Number.isFinite(video.duration) && video.duration > 0) {
        const time = (elapsed - VIDEO_START_SECONDS) % video.duration
        if (Math.abs(video.currentTime - time) > 0.35) video.currentTime = time
      }
      void video.play().then(() => {
        if (!cancelled) setActive(true)
      }).catch(() => setActive(false))
    }

    function onVisibilityChange() {
      if (document.hidden) video?.pause()
      else syncPlayback()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    video.addEventListener('loadedmetadata', syncPlayback)
    syncPlayback()
    stopTimer = window.setTimeout(syncPlayback, Math.max(0, RESET_SECONDS * 1000 - (performance.now() - startedAt)))

    return () => {
      cancelled = true
      window.clearTimeout(startTimer)
      window.clearTimeout(stopTimer)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      video.removeEventListener('loadedmetadata', syncPlayback)
      video.pause()
    }
  }, [reducedMotion, startedAt])

  return (
    <div className="horizon-ripples" style={{ backgroundImage: `url(${WATER_IMAGE})` }} aria-hidden="true">
      {!reducedMotion && <video
        ref={videoRef}
        className={`horizon-ripples__water${active ? ' is-active' : ''}`}
        src={WATER_VIDEO}
        muted
        playsInline
        loop
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
      />}
    </div>
  )
}
