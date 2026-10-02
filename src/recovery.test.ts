import { describe, expect, it } from 'vitest'
import { getRecoveryActions } from './recovery'
import { createActiveSearch } from './storage'

describe('recovery actions', () => {
  it('gives cash-only searches cash advice without card protection instructions', () => {
    const search = { ...createActiveSearch('money', 'Cash'), answers: { itemDetail: 'cash' } }
    const actions = getRecoveryActions(search)
    expect(actions[0].title).toBe('Trace the cash handoff')
    expect(JSON.stringify(actions)).not.toMatch(/freeze|lock|issuer/i)
  })

  it('keeps card protection for cards and makes uncertainty conditional', () => {
    for (const itemDetail of ['card', 'both']) {
      expect(getRecoveryActions({ ...createActiveSearch('money', 'Money'), answers: { itemDetail } })[0].title).toBe('Freeze missing cards')
    }
    expect(getRecoveryActions({ ...createActiveSearch('money', 'Money'), answers: { itemDetail: 'unsure' } })[0].detail).toContain('If a payment card may be missing')
  })

  it('uses last-known location advice for a dead phone and access advice for work keys', () => {
    expect(getRecoveryActions({ ...createActiveSearch('phone', 'Phone'), answers: { itemDetail: 'dead' } })[0].detail).toContain('dead battery')
    expect(getRecoveryActions({ ...createActiveSearch('keys', 'Keys'), answers: { itemDetail: 'work' } })[0].detail).toContain('facilities team')
  })
  it('gives urgent medicine an immediate safety action', () => {
    const search = { ...createActiveSearch('medicine', 'Medicine'), answers: { itemDetail: 'urgent' } }
    expect(getRecoveryActions(search)[0].detail).toContain('Do not wait')
  })

  it('uses the custom item name in the next-step guidance', () => {
    const search = createActiveSearch('other', 'Work badge')
    expect(getRecoveryActions(search)[0].detail).toContain('work badge')
  })
})
