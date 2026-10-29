import { describe, expect, it } from 'vitest'
import { featherPose } from './featherFlight'

describe('one natural feather landing', () => {
  it('descends continuously to one shallow rest and stays there for all later breaths', () => {
    expect(featherPose(0).height).toBe(1)
    for (let seconds = .25; seconds <= 12; seconds += .25) {
      expect(featherPose(seconds).height).toBeLessThanOrEqual(featherPose(seconds - .25).height)
    }
    expect(featherPose(12)).toEqual(featherPose(24))
    expect(featherPose(24)).toEqual(featherPose(36))
    expect(featherPose(36).roll).toBe(-64)
  })

  it('flutters without flipping or jumping at water contact', () => {
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

  it('uses a still resting pose for reduced motion before and after Begin', () => {
    for (const seconds of [0, 4, 12, 24, 36]) {
      expect(featherPose(seconds, true)).toEqual({ height: 0, offset: 0, roll: -64, yaw: 0, pitch: 0 })
    }
  })
})
