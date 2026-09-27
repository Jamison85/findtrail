import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createActiveSearch } from '../storage'
import type { ActiveSearch } from '../types'
import { StillMissingView } from './StillMissingView'

function finishedSearch(itemId: ActiveSearch['itemId'] = 'keys'): ActiveSearch {
  return {
    ...createActiveSearch(itemId, itemId === 'keys' ? 'Keys' : 'Medicine'),
    stops: [
      { id: 'entry', title: 'The landing zone', instruction: 'Check the landing zone.', spots: ['Entry hook', 'Counter'] },
      { id: 'pockets', title: 'Current pockets', instruction: 'Check current pockets.', spots: ['Pants'] },
    ],
    currentIndex: 1,
    checkedSpots: { entry: ['Entry hook', 'Counter'], pockets: ['Pants'] },
  }
}

function renderView(search = finishedSearch()) {
  const actions = {
    onReviewSkipped: vi.fn(),
    onFound: vi.fn(),
    onReset: vi.fn(),
    onRestart: vi.fn(),
    onHome: vi.fn(),
  }
  render(<StillMissingView search={search} {...actions} />)
  return actions
}

describe('StillMissingView', () => {
  it('turns an unsuccessful trail into one calm, ordered recovery plan', () => {
    renderView()

    expect(screen.getByRole('heading', { name: 'Pause the search loop.' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Suggested route complete.*2 areas visited.*3 exact spots checked/i)).toBeInTheDocument()
    const plan = screen.getByRole('list', { name: 'Next actions for Keys' })
    expect(within(plan).getAllByRole('listitem')).toHaveLength(3)
    expect(within(plan).getByText('Start here')).toBeInTheDocument()
  })

  it('keeps urgent medicine guidance ahead of calming actions', () => {
    const search = { ...finishedSearch('medicine'), answers: { itemDetail: 'urgent' } }
    renderView(search)

    expect(screen.getByRole('heading', { name: 'Handle the dose first.' })).toBeInTheDocument()
    expect(screen.getByText('Safety first')).toBeInTheDocument()
    expect(screen.getByText(/Do not wait on another search/i)).toBeInTheDocument()
  })

  it('counts checked areas separately from skipped ones and offers a direct return', () => {
    const search = { ...finishedSearch(), checkedSpots: { entry: ['Entry hook'] }, skippedStops: ['pockets'] }
    const actions = renderView(search)

    expect(screen.getByLabelText(/Suggested route complete.*1 area visited.*1 exact spot checked.*1 area skipped/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Current pockets' }))
    expect(actions.onReviewSkipped).toHaveBeenCalledWith('pockets')
  })

  it('connects every recovery exit to its existing behavior', () => {
    const actions = renderView()

    fireEvent.click(screen.getByRole('button', { name: 'Breathing reset' }))
    fireEvent.click(screen.getByRole('button', { name: 'Repeat trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'I found it after all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }))

    expect(actions.onReset).toHaveBeenCalledOnce()
    expect(actions.onRestart).toHaveBeenCalledOnce()
    expect(actions.onFound).toHaveBeenCalledOnce()
    expect(actions.onHome).toHaveBeenCalledOnce()
  })
})
