import { useEffect, useRef, useState } from 'react'

interface HorizonRipplesProps {
  reducedMotion: boolean
  startedAt: number | null
}

const WATER_IMAGE = `${import.meta.env.BASE_URL}findtrail-reset-lake.webp`
const WATER_VIDEO = `${import.meta.env.BASE_URL}findtrail-reset-water.mp4`
// The upper, clean impact starts around .8s into the footage. Align that one
// ripple with the feather settling at 7.2s, 17.2s and 27.2s.
const CYCLE_SECONDS = 10
const VIDEO_START_SECONDS = 7.1
const VIDEO_SOURCE_OFFSET = 0.7
const VIDEO_END_SECONDS = 9.95
const RESET_SECONDS = 30

export function HorizonRipples({ reducedMotion, startedAt }: HorizonRipplesProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video || reducedMotion || startedAt === null) {
      video?.pause()
      setActive(false)
      return
    }

    let cancelled = false

    function syncPlayback() {
      if (!video || cancelled) return
      const elapsed = (performance.now() - startedAt!) / 1000
      const withinCycle = elapsed % CYCLE_SECONDS
      if (document.hidden || elapsed >= RESET_SECONDS || withinCycle < VIDEO_START_SECONDS || withinCycle >= VIDEO_END_SECONDS) {
        setActive(false)
        video.pause()
        return
      }

      if (Number.isFinite(video.duration) && video.duration > 0) {
        const time = withinCycle - VIDEO_START_SECONDS + VIDEO_SOURCE_OFFSET
        if (Math.abs(video.currentTime - time) > 0.35) video.currentTime = time
      }
      if (video.paused) {
        void video.play().then(() => {
          if (!cancelled) setActive(true)
        }).catch(() => setActive(false))
      }
    }

    function onVisibilityChange() {
      syncPlayback()
    }

    const timer = window.setInterval(syncPlayback, 100)
    document.addEventListener('visibilitychange', onVisibilityChange)
    video.addEventListener('loadedmetadata', syncPlayback)
    syncPlayback()

    return () => {
      cancelled = true
      window.clearInterval(timer)
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
        preload="auto"
        disablePictureInPicture
        aria-hidden="true"
      />}
    </div>
  )
}
