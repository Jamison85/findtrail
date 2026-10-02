import { CYCLE_SECONDS, HOLD_SECONDS, INHALE_SECONDS, RESET_CYCLES, TOTAL_SECONDS } from './resetTiming'

// Zero velocity and acceleration at either end: turns ease into water contact
// without restarting an easing curve at intermediate poses.
function smooth(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function featherPose(elapsed: number, reducedMotion = false) {
  const time = Math.max(0, Math.min(TOTAL_SECONDS, elapsed))
  const cycle = Math.min(RESET_CYCLES - 1, Math.floor(time / CYCLE_SECONDS))
  const within = time - cycle * CYCLE_SECONDS
  const progress = within / CYCLE_SECONDS
  const angle = progress * Math.PI * 2
  const envelope = Math.sin(Math.PI * progress) ** 4
  const direction = cycle === 1 ? -1 : 1
  const height = within < INHALE_SECONDS
    ? smooth(within / INHALE_SECONDS)
    : within < INHALE_SECONDS + HOLD_SECONDS
      ? 1
      : 1 - smooth((within - INHALE_SECONDS - HOLD_SECONDS) / (CYCLE_SECONDS - INHALE_SECONDS - HOLD_SECONDS))

  if (reducedMotion) return { height, offset: 0, roll: 0, yaw: 0, pitch: 0 }

  return {
    height,
    offset: direction * envelope * (.7 * Math.sin(angle + cycle * .35) + .12 * Math.sin(angle * 2 + .6)),
    roll: direction * envelope * (11 * Math.sin(angle + .45) + 2 * Math.sin(angle * 2)),
    yaw: cycle === 0
      ? 30 * envelope * Math.sin(angle * .7 + .2)
      : cycle === 1
        ? 360 * smooth(progress) + 8 * envelope * Math.sin(angle)
        : 360 + 16 * envelope * Math.sin(angle),
    pitch: cycle === 2
      ? 360 * smooth(progress)
      : 6 * envelope * Math.sin(angle + .25),
  }
}
