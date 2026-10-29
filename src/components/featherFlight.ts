import { CONTACT_SECONDS } from './resetTiming'

function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

// One descent and one touch. The breath clock is independent of the feather.
export function featherPose(elapsed: number, reducedMotion = false) {
  if (reducedMotion) return { height: 0, offset: 0, roll: -64, yaw: 0, pitch: 0 }
  const time = Math.max(0, elapsed)
  if (time >= CONTACT_SECONDS) {
    // Continue the breath timer while the feather floats at the contact point.
    const floating = time - CONTACT_SECONDS
    const settle = smooth(Math.min(1, floating / 2))
    return {
      height: 0,
      offset: 0,
      roll: -64 + .55 * settle * Math.sin(floating * .45),
      yaw: 0,
      pitch: 0,
    }
  }
  const progress = time / CONTACT_SECONDS
  const land = smooth(progress)
  const flutter = Math.sin(progress * Math.PI) ** 2
  return {
    height: 1 - land,
    // Any lateral drift decays to zero exactly when the ripple appears.
    offset: flutter * (.33 * Math.sin(progress * 11) + .12 * Math.sin(progress * 21 + .7)),
    roll: -9 - 55 * land + flutter * 4 * Math.sin(progress * 13 + .3),
    yaw: flutter * 12 * Math.sin(progress * 7 + .5),
    pitch: flutter * 5 * Math.sin(progress * 10),
  }
}
