import { describe, expect, it } from 'vitest'
import { featherPose } from './featherFlight'

describe('one natural feather landing', () => {
  it('descends only once, then stays at the waterline', () => {
    expect(featherPose(0).height).toBe(1)
    for (let seconds = .25; seconds <= 12; seconds += .25) {
      expect(featherPose(seconds).height).toBeLessThanOrEqual(featherPose(seconds - .25).height)
    }
    for (let seconds = 12; seconds <= 36; seconds += .25) {
      const pose = featherPose(seconds)
      expect(pose.height).toBe(0)
      expect(pose.offset).toBe(0)
      expect(pose.yaw).toBe(0)
      expect(pose.pitch).toBe(0)
    }
    expect(featherPose(12).roll).toBe(-64)
  })

  it('lands at the single ripple origin without flipping or jumping', () => {
    for (let seconds = 0; seconds < 12; seconds += .2) {
      const pose = featherPose(seconds)
      expect(Math.abs(pose.yaw)).toBeLessThan(13)
      expect(Math.abs(pose.pitch)).toBeLessThan(6)
      expect(Math.abs(pose.roll)).toBeLessThan(70)
    }
    for (const axis of ['height', 'offset', 'roll', 'yaw', 'pitch'] as const) {
      expect(Math.abs(featherPose(11.999)[axis] - featherPose(12)[axis])).toBeLessThan(.01)
    }
  })

  it('rocks almost imperceptibly after contact, but is completely still in reduced motion', () => {
    const a = featherPose(17)
    const b = featherPose(22)
    expect(a.roll).not.toBe(b.roll)
    expect(Math.abs(a.roll + 64)).toBeLessThan(1)
    expect(Math.abs(b.roll + 64)).toBeLessThan(1)
    for (const seconds of [0, 4, 12, 24, 36]) {
      expect(featherPose(seconds, true)).toEqual({ height: 0, offset: 0, roll: -64, yaw: 0, pitch: 0 })
    }
  })
})
