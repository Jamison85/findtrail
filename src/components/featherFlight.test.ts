import { describe, expect, it } from 'vitest'
import { featherPose } from './featherFlight'

describe('continuous feather flight', () => {
  it('meets the water at each exhale ending and rests after the last breath', () => {
    for (const seconds of [0, 12, 24, 36, 60]) {
      const pose = featherPose(seconds)
      expect(pose.height).toBeCloseTo(0, 10)
      expect(pose.offset).toBeCloseTo(0, 10)
      expect(pose.roll).toBeCloseTo(0, 10)
      expect(pose.yaw % 360).toBeCloseTo(0, 10)
      expect(pose.pitch % 360).toBeCloseTo(0, 10)
    }
    expect(featherPose(60)).toEqual(featherPose(36))
  })

  it('keeps turning through the former keyframe stops', () => {
    for (const seconds of [15, 18, 21]) {
      const yawBefore = featherPose(seconds - .001).yaw
      const yawAt = featherPose(seconds).yaw
      const yawAfter = featherPose(seconds + .001).yaw
      const incoming = (yawAt - yawBefore) / .001
      const outgoing = (yawAfter - yawAt) / .001
      expect(incoming).toBeGreaterThan(5)
      expect(outgoing).toBeGreaterThan(5)
      expect(Math.abs(incoming - outgoing)).toBeLessThan(.1)
    }
  })

  it('arrives and departs without jumps in speed at breath boundaries', () => {
    for (const seconds of [12, 24]) {
      const before = featherPose(seconds - .001)
      const after = featherPose(seconds + .001)
      for (const axis of ['height', 'offset', 'roll', 'yaw', 'pitch'] as const) {
        expect(Math.abs(after[axis] - before[axis]) / .002).toBeLessThan(.001)
      }
    }
  })

  it('holds at inhale height and keeps reduced motion free of spins and drift', () => {
    expect(featherPose(4).height).toBe(1)
    expect(featherPose(5).height).toBe(1)
    expect(featherPose(6).height).toBe(1)
    for (let seconds = 0; seconds <= 36; seconds += .5) {
      const pose = featherPose(seconds, true)
      expect(pose.height).toBeGreaterThanOrEqual(0)
      expect(pose.height).toBeLessThanOrEqual(1)
      expect([pose.offset, pose.roll, pose.yaw, pose.pitch]).toEqual([0, 0, 0, 0])
    }
  })
})
