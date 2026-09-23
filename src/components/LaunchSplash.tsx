import { BrandMark } from './BrandMark'

export function LaunchSplash({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div
      className={`launch-splash${reducedMotion ? ' is-reduced-motion' : ''}`}
      role="status"
      aria-label="FindTrail is opening"
    >
      <div className="launch-splash__glow" aria-hidden="true" />
      <div className="launch-splash__lockup" aria-hidden="true">
        <BrandMark className="launch-splash__mark" />
        <strong className="launch-splash__wordmark">FindTrail</strong>
      </div>
    </div>
  )
}
