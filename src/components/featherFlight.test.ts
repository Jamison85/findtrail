import { describe, expect, it } from 'vitest'
import { FEATHER_MASS, FEATHER_TIP, featherPlacement, featherPose, projectedTip } from './featherFlight'

const axes = ['height', 'offset', 'roll', 'yaw', 'pitch', 'bend'] as const

function velocity(time: number, axis: typeof axes[number], step = .001) {
  return (featherPose(time + step)[axis] - featherPose(time - step)[axis]) / (2 * step)
}

describe('one natural feather landing', () => {
  it('descends once with two slower catches of air and remains on the lake for all three breaths', () => {
    expect(featherPose(0).height).toBe(1)
    for (let time = .025; time <= 36; time += .025) {
      const pose = featherPose(time)
      expect(pose.height).toBeGreaterThanOrEqual(0)
      expect(pose.height).toBeLessThanOrEqual(featherPose(time - .025).height + .000001)
      if (time >= 12) expect(pose.height).toBe(0)
    }
    expect(Math.abs(velocity(3.7, 'height'))).toBeLessThan(Math.abs(velocity(2, 'height')))
    expect(Math.abs(velocity(7.35, 'height'))).toBeLessThan(Math.abs(velocity(6.65, 'height')))
  })

  it('keeps position, velocity, and orientation continuous across every phase transition', () => {
    for (const time of [2, 3.7, 4.55, 6.65, 7.35, 7.5, 8.25, 9.2, 10.5, 12, 13]) {
      for (const axis of axes) {
        const before = featherPose(time - .0001)[axis]
        const after = featherPose(time + .0001)[axis]
        expect(Math.abs(after - before), `${axis} at ${time}`).toBeLessThan(axis === 'roll' ? .01 : .005)
        const left = (featherPose(time)[axis] - before) / .0001
        const right = (after - featherPose(time)[axis]) / .0001
        expect(Math.abs(left - right), `${axis} velocity at ${time}`).toBeLessThan(.015)
      }
    }
    for (const time of [2, 7.35, 7.5, 10.5, 12, 13]) {
      for (const axis of ['x', 'y'] as const) {
        const place = (at: number) => featherPlacement(featherPose(at), 121, 181.5, 844)[axis]
        const step = .0001
        const before = place(time - step)
        const at = place(time)
        const after = place(time + step)
        expect(Math.abs(after - before), `screen ${axis} at ${time}`).toBeLessThan(.03)
        expect(Math.abs((at - before) / step - (after - at) / step), `screen ${axis} velocity at ${time}`).toBeLessThan(.03)
      }
    }
  })

  it('never flips or makes cartoon sized turns', () => {
    for (let time = 0; time <= 36; time += .025) {
      const pose = featherPose(time)
      expect(pose.roll).toBeGreaterThan(-66)
      expect(pose.roll).toBeLessThan(0)
      expect(Math.abs(pose.yaw)).toBeLessThan(24)
      expect(Math.abs(pose.pitch)).toBeLessThan(12)
      expect(Math.abs(pose.bend)).toBeLessThan(4)
      if (time < 10.5) expect(Math.abs(pose.offset)).toBeLessThan(32)
    }
  })

  it('places the measured visible quill tip on the ripple at contact on mobile sizes', () => {
    expect(FEATHER_TIP.y).toBeGreaterThan(FEATHER_MASS.y)
    for (const [width, height, sceneHeight] of [[112, 168, 720], [121, 181.5, 844], [152, 228, 920]]) {
      const pose = featherPose(12)
      const placement = featherPlacement(pose, width, height, sceneHeight)
      const tip = projectedTip(pose, width, height)
      expect(Math.hypot(placement.x + tip.x, placement.y + tip.y)).toBeLessThan(.001)
      const pre = featherPose(11.9)
      const prePlacement = featherPlacement(pre, width, height, sceneHeight)
      const preTip = projectedTip(pre, width, height)
      expect(prePlacement.y + preTip.y).toBeLessThan(0)
      for (let time = 0; time < 11.99; time += .01) {
        const airborne = featherPose(time)
        const center = featherPlacement(airborne, width, height, sceneHeight)
        const quill = projectedTip(airborne, width, height)
        expect(center.y + quill.y, `early contact at ${time}`).toBeLessThan(0)
      }
    }
  })

  it('settles without another impact and rests still in reduced motion', () => {
    const contact = featherPose(12)
    const settle = featherPose(13)
    const floating = featherPose(24)
    expect(Math.abs(settle.roll - contact.roll)).toBeLessThan(1)
    expect(Math.abs(floating.roll - settle.roll)).toBeLessThan(1)
    expect(Math.abs(floating.offset)).toBeLessThan(1)
    for (const time of [0, 4, 12, 24, 36]) expect(featherPose(time, true)).toEqual(contact)
  })
})
