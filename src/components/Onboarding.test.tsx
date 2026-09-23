import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ONBOARDING_STORAGE_KEY, Onboarding, shouldShowOnboarding } from './Onboarding'

describe('Onboarding', () => {
  beforeEach(() => localStorage.clear())

  it('keeps onboarding resumable when only an empty auto-saved record exists', () => {
    expect(shouldShowOnboarding()).toBe(true)

    localStorage.setItem('findtrail:data:v3', JSON.stringify({
      version: 3,
      activeSearch: null,
      history: [],
      savedItems: [],
      settings: { motion: 'system', textSize: 'standard', speakSteps: false, calmPause: true },
    }))
    expect(shouldShowOnboarding()).toBe(true)
  })

  it('does not interrupt someone with meaningful existing FindTrail data', () => {
    localStorage.setItem('findtrail:data:v3', JSON.stringify({
      version: 3,
      activeSearch: null,
      history: [{ id: 'existing-find' }],
      savedItems: [],
      settings: { motion: 'system', textSize: 'standard', speakSteps: false, calmPause: true },
    }))
    expect(shouldShowOnboarding()).toBe(false)
  })

  it('explains the three-part FindTrail flow and remembers completion', () => {
    let completed = false
    render(<Onboarding onComplete={() => { completed = true }} />)

    expect(screen.getByRole('heading', { name: 'You lost something. Start with what you know.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Give it the clues you actually remember.' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('heading', { name: 'Check one likely place at a time.' })).toBeInTheDocument()
    expect(screen.getByText('Reset')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Start finding' }))
    expect(completed).toBe(true)
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1')
  })

  it('lets someone skip without nagging them next time', () => {
    const onComplete = () => undefined
    render(<Onboarding onComplete={onComplete} />)
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1')
  })
})
