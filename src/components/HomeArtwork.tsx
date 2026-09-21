import { useEffect, useState } from 'react'

const artworkUrl = `${import.meta.env.BASE_URL}home-memory-trail.webp`

const HOME_TRAIL_PLAYED_KEY = 'findtrail:home-trail-played'

// One continuous route that follows the photographed runner and ends at the keys.
const trailPath = [
  'M934 1000',
  'C950 900 978 820 990 742',
  'C1012 658 1122 620 1195 548',
  'C1254 490 1233 417 1160 380',
  'C1109 350 1088 294 1082 250',
].join('')

function hasPlayedThisSession(): boolean {
  try {
    return window.sessionStorage.getItem(HOME_TRAIL_PLAYED_KEY) === 'true'
  } catch {
    return false
  }
}

export function HomeArtwork() {
  const [playTrail] = useState(() => !hasPlayedThisSession())

  useEffect(() => {
    if (!playTrail) return
    try {
      window.sessionStorage.setItem(HOME_TRAIL_PLAYED_KEY, 'true')
    } catch {
      // The one-time motion still works when storage is unavailable.
    }
  }, [playTrail])

  return (
    <div className="home-artwork" role="img" aria-label="A search light follows a winding trail through the home and blinks green at the missing keys">
      <img
        src={artworkUrl}
        alt=""
        width="1536"
        height="1024"
        fetchPriority="high"
        draggable="false"
      />
      <svg className={`home-artwork__trail ${playTrail ? 'is-playing' : 'is-settled'}`} viewBox="0 0 1536 1024" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <filter id="findtrail-orb-haze" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="12" />
          </filter>
        </defs>

        <g className="home-artwork__search-orb">
          <circle className="home-artwork__orb-haze" r="40" />
          <circle className="home-artwork__orb-shell" r="16" />
          <circle className="home-artwork__orb-core" r="6.5" />
          <animateMotion
            begin=".3s"
            dur="5.45s"
            fill="freeze"
            path={trailPath}
            calcMode="paced"
          />
        </g>
      </svg>
    </div>
  )
}
