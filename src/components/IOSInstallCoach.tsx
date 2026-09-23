import { useEffect, useState } from 'react'

const STORAGE_KEY = 'findtrail:ios-install-coach-seen-v1'
const SHOW_DELAY_MS = 900

type StandaloneNavigator = Navigator & { standalone?: boolean }

function isRunningStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as StandaloneNavigator).standalone === true
}

function isIOSDevice(): boolean {
  const userAgent = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function canShowIOSInstallInstructions(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false
  return isIOSDevice() && !isRunningStandalone()
}

function markCoachSeen(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // A blocked storage API should not prevent the install guidance from working.
  }
}

function hasSeenCoach(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function IOSInstallCoach({ enabled = true, requestKey = 0 }: { enabled?: boolean; requestKey?: number }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled || !canShowIOSInstallInstructions()) return

    if (requestKey > 0) {
      markCoachSeen()
      setVisible(true)
      return
    }

    if (hasSeenCoach()) return

    const timer = window.setTimeout(() => {
      markCoachSeen()
      setVisible(true)
    }, SHOW_DELAY_MS)

    return () => window.clearTimeout(timer)
  }, [enabled, requestKey])

  if (!visible) return null

  return (
    <div className="install-coach__scrim">
      <section className="install-coach" role="dialog" aria-modal="true" aria-labelledby="install-coach-title" aria-describedby="install-coach-copy">
        <button className="install-coach__close" type="button" onClick={() => setVisible(false)} aria-label="Dismiss Home Screen instructions">×</button>

        <div className="install-coach__mark" aria-hidden="true">
          <img src={`${import.meta.env.BASE_URL}icon-192.png`} alt="" />
        </div>

        <div className="install-coach__heading">
          <span>Keep FindTrail one tap away</span>
          <h2 id="install-coach-title">Add FindTrail to your Home Screen</h2>
          <p id="install-coach-copy">iPhone makes you confirm the final step yourself. It only takes a few taps.</p>
        </div>

        <ol className="install-coach__steps">
          <li>
            <span className="install-coach__step-number">1</span>
            <span><strong>Tap Share</strong><small>The square with the arrow pointing up.</small></span>
            <svg className="install-coach__share-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 16V3m0 0L8 7m4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
            </svg>
          </li>
          <li>
            <span className="install-coach__step-number">2</span>
            <span><strong>Choose “Add to Home Screen”</strong><small>You may need to scroll down in the Share menu.</small></span>
          </li>
          <li>
            <span className="install-coach__step-number">3</span>
            <span><strong>Leave “Open as Web App” on, then tap Add</strong><small>FindTrail will open from its own icon like an app.</small></span>
          </li>
        </ol>

        <div className="install-coach__footer">
          <p>Your trails stay on this device, and FindTrail’s offline support still works from the Home Screen.</p>
          <button className="button button--primary button--wide" type="button" onClick={() => setVisible(false)}>Got it</button>
        </div>
      </section>
    </div>
  )
}
