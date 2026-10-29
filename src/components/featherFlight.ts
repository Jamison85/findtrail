import { CONTACT_SECONDS } from './resetTiming'

// Measured on the transparent 384 × 576 artwork.
export const FEATHER_MASS = { x: .52, y: .54 }
export const FEATHER_TIP = { x: .543, y: .934 }

type Key = readonly [seconds: number, value: number, velocity: number]

// Hermite curves describe changing air currents and drag. Explicit velocity
// at each knot makes position and velocity continuous across the phases.
function current(seconds: number, keys: readonly Key[]): number {
  if (seconds <= keys[0][0]) return keys[0][1]
  for (let i = 0; i < keys.length - 1; i++) {
    const [start, a, av] = keys[i]
    const [end, b, bv] = keys[i + 1]
    if (seconds > end) continue
    const span = end - start
    const t = (seconds - start) / span
    const t2 = t * t
    const t3 = t2 * t
    return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * span * av
      + (-2 * t3 + 3 * t2) * b + (t3 - t2) * span * bv
  }
  return keys[keys.length - 1][1]
}

// Two catches of air flatten vertical speed. Horizontal reversals are unequal.
const rise: readonly Key[] = [
  [0, 1, -.064], [2, .83, -.105], [3.7, .65, -.025],
  [4.55, .615, -.085], [6.65, .385, -.09], [7.35, .345, -.027],
  [9.2, .165, -.105], [10.5, .055, -.052], [12, 0, 0],
]
const sideways: readonly Key[] = [
  [0, 17, -11], [1.9, -5, -5], [3.65, -18, 8],
  [5.2, 11, 15], [6.5, 22, -8], [8.25, 4, -10],
  [10.35, -8, 0], [12, 0, 0],
]
const roll: readonly Key[] = [
  [0, -11, 5], [1.8, -3, 1], [3.7, -16, -3],
  [5.25, -7, 6], [6.8, -19, -3], [8.5, -10, 0],
  [10.5, -25, -14], [12, -64, 0],
]
const yaw: readonly Key[] = [
  [0, 13, 5], [1.7, 19, -4], [3.65, -9, -10],
  [5.1, -18, 6], [6.9, 11, 6], [8.7, 15, -5],
  [10.5, 7, -3], [12, 5, 0],
]
const pitch: readonly Key[] = [
  [0, -5, 2], [2.1, 6, 1], [3.9, 9, -3],
  [5.7, -7, -1], [7.6, -3, 3], [9.7, 5, 0],
  [12, 3, 0],
]
const bend: readonly Key[] = [
  [0, -1.2, 1], [2.2, 1.5, .3], [4.2, -1.8, -1],
  [6.6, 2.2, 0], [8.6, -.6, -.5], [12, .5, 0],
]

export interface FeatherPose {
  height: number // fraction of responsive 170–250 px travel
  offset: number // pixels of sideways air drift
  roll: number
  yaw: number
  pitch: number
  bend: number
}

const REST: FeatherPose = { height: 0, offset: 0, roll: -64, yaw: 5, pitch: 3, bend: .5 }

export function featherPose(elapsed: number, reducedMotion = false): FeatherPose {
  if (reducedMotion) return REST
  const time = Math.max(0, elapsed)
  if (time < CONTACT_SECONDS) return {
    height: current(time, rise),
    offset: current(time, sideways),
    roll: current(time, roll),
    yaw: current(time, yaw),
    pitch: current(time, pitch),
    bend: current(time, bend),
  }

  // The quill stays anchored while the vane settles, then barely rocks.
  const age = time - CONTACT_SECONDS
  const settle = 1 - Math.exp(-age * 2.4) * (1 + age * 2.4)
  return {
    height: 0,
    offset: .35 * settle + .3 * (1 - Math.exp(-age * 2)) * Math.sin(age * .35),
    roll: REST.roll + .65 * settle + .24 * (1 - Math.exp(-age)) * Math.sin(age * .72),
    yaw: REST.yaw + .7 * settle,
    pitch: REST.pitch + .4 * settle,
    bend: REST.bend,
  }
}

// Matches rotate() skewX() scale() in CSS. The artwork rotates around its mass
// center; subtracting this vector pins the visible quill tip to the ripple.
export function projectedTip(pose: FeatherPose, width: number, height: number) {
  const dx = (FEATHER_TIP.x - FEATHER_MASS.x) * width * Math.cos(pose.yaw * Math.PI / 180)
  const dy = (FEATHER_TIP.y - FEATHER_MASS.y) * height * Math.cos(pose.pitch * Math.PI / 180)
  const bentX = dx + Math.tan(pose.bend * Math.PI / 180) * dy
  const angle = pose.roll * Math.PI / 180
  return { x: bentX * Math.cos(angle) - dy * Math.sin(angle), y: bentX * Math.sin(angle) + dy * Math.cos(angle) }
}

export function featherPlacement(pose: FeatherPose, width: number, height: number, sceneHeight: number) {
  const tip = projectedTip(pose, width, height)
  const restingTip = projectedTip(REST, width, height)
  const travel = Math.max(170, Math.min(250, sceneHeight * .21))
  // Airborne movement is based on the center of mass, not the quill. During
  // approach the placement gradually transfers to the tip contact geometry.
  const approach = Math.max(0, Math.min(1, (1 - pose.height - .655) / .29))
  const anchor = approach * approach * (3 - 2 * approach)
  return {
    x: -restingTip.x + (restingTip.x - tip.x) * anchor + pose.offset,
    y: -restingTip.y + (restingTip.y - tip.y) * anchor - travel * pose.height,
  }
}
