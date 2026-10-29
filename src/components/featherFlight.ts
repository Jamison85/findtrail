import { CONTACT_SECONDS } from './resetTiming'

function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

// One descent and one touch. The breath clock is independent of the feather.
export function featherPose(elapsed: number, reducedMotion = false) {
  if (reducedMotion) return { height: 0, offset: 0, roll: -64, yaw: 0, pitch: 0 }
  const progress = Math.max(0, Math.min(1, elapsed / CONTACT_SECONDS))
  const land = smooth(progress)
  const flutter = Math.sin(progress * Math.PI) ** 2
  return {
    height: 1 - land,
    offset: -1.6 * land + flutter * (.14 * Math.sin(progress * 11) + .07 * Math.sin(progress * 21 + .7)),
    roll: -9 - 55 * land + flutter * 4 * Math.sin(progress * 13 + .3),
    yaw: flutter * 12 * Math.sin(progress * 7 + .5),
    pitch: flutter * 5 * Math.sin(progress * 10),
  }
}
