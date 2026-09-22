import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveSearch } from '../types'
import { WidenSearchView } from './WidenSearchView'

const search: ActiveSearch = {
  version: 3,
  id: 'widen-test',
  itemId: 'keys',
  itemLabel: 'Keys',
  answers: { itemDetail: 'car', lastPlace: 'home', lastAction: 'arrived' },
  stops: [
    { id: 'drop-zone', title: 'The landing zone', instruction: 'Check here.', spots: ['Entry table'] },
    { id: 'pockets', title: 'Current and previous pockets', instruction: 'Check here.', spots: ['Current pants'] },
    { id: 'counters', title: 'Flat surfaces', instruction: 'Check here.', spots: ['Kitchen counter'] },
    { id: 'car', title: 'The car drop zones', instruction: 'Check here.', spots: ['Seat gap'] },
    { id: 'bags', title: 'Bags, one pocket at a time', instruction: 'Check here.', spots: ['Work bag'] },
    { id: 'seating', title: 'Where you sat down', instruction: 'Check here.', spots: ['Couch'] },
    { id: 'slow-sweep', title: 'Slow final sweep', instruction: 'Check slowly.', spots: ['Likeliest place'], kind: 'final' },
  ],
  currentIndex: 2,
  checkedSpots: { 'drop-zone': ['Entry table'], pockets: ['Current pants'] },
  startedAt: '2026-09-22T12:00:00.000Z',
  lastUpdatedAt: '2026-09-22T12:00:00.000Z',
}

describe('WidenSearchView', () => {
  it('previews only the next three places and keeps every exit explicit', () => {
    const actions = { onWiden: vi.fn(), onFound: vi.fn(), onReset: vi.fn(), onHome: vi.fn() }
    render(<WidenSearchView search={search} {...actions} />)

    expect(screen.getByRole('heading', { name: 'Pause before going wider.' })).toBeInTheDocument()
    expect(screen.getByLabelText(/3 strongest places completed.*2 exact spots checked.*trail is saved/i)).toBeInTheDocument()
    const preview = screen.getByRole('list', { name: 'Next places to check for Keys' })
    expect(within(preview).getAllByRole('listitem')).toHaveLength(3)
    expect(within(preview).getByText('The car drop zones')).toBeInTheDocument()
    expect(within(preview).queryByText('Slow final sweep')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Search these 3 places' }))
    fireEvent.click(screen.getByRole('button', { name: '30-second reset' }))
    fireEvent.click(screen.getByRole('button', { name: 'I found it after all' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save and leave' }))

    expect(actions.onWiden).toHaveBeenCalledOnce()
    expect(actions.onReset).toHaveBeenCalledOnce()
    expect(actions.onFound).toHaveBeenCalledOnce()
    expect(actions.onHome).toHaveBeenCalledOnce()
  })
})
