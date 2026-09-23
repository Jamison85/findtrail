import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ActiveSearch } from '../types'
import { CompleteView, FoundView } from './FoundView'

const search: ActiveSearch = {
  version: 3,
  id: 'search-1',
  itemId: 'keys',
  itemLabel: 'Keys',
  answers: {},
  stops: [{
    id: 'drop-zone',
    title: 'The landing zone',
    instruction: 'Check where your hands unloaded.',
    spots: ['Entry table or hook', 'Beside the door'],
  }],
  currentIndex: 0,
  checkedSpots: { 'drop-zone': ['Entry table or hook'] },
  startedAt: '2026-09-21T08:00:00.000Z',
  lastUpdatedAt: '2026-09-21T08:02:00.000Z',
}

const baseProps = {
  search,
  saveAsHome: false,
  pinCustomItem: false,
  onChange: vi.fn(),
  onSaveAsHome: vi.fn(),
  onPinCustomItem: vi.fn(),
  onSave: vi.fn(),
  onBack: vi.fn(),
}

describe('FoundView', () => {
  it('makes the exact found place the only required detail', () => {
    render(<FoundView {...baseProps} value="" />)

    expect(screen.getByRole('heading', { name: 'There it is.' })).toBeInTheDocument()
    expect(screen.getByText('This find already teaches the trail.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save this found place' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Entry table or hook' }))
    expect(baseProps.onChange).toHaveBeenCalledWith('Entry table or hook')
  })

  it('shows the carried found place as ready and offers a home spot', () => {
    render(<FoundView {...baseProps} value="Entry table or hook" />)

    expect(screen.getByLabelText('Exact place')).toHaveValue('Entry table or hook')
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entry table or hook' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Save this found place' })).toBeEnabled()

    fireEvent.click(screen.getByRole('checkbox', { name: /make this the home spot for keys/i }))
    expect(baseProps.onSaveAsHome).toHaveBeenCalledWith(true)
  })

  it('explains exactly what was remembered after saving', () => {
    render(
      <CompleteView
        summary={{ itemId: 'keys', itemLabel: 'Keys', location: 'Entry tray', seconds: 90, stopsChecked: 2, savedAsHome: true }}
        durationLabel="2 min"
        onHome={vi.fn()}
        onAnother={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'Found and remembered.' })).toBeInTheDocument()
    expect(screen.getByText('Entry tray')).toBeInTheDocument()
    expect(screen.getByText('Home spot saved.')).toBeInTheDocument()
    expect(screen.getByText('FindTrail will check here first next time.')).toBeInTheDocument()
    expect(screen.getByText('Places visited')).toBeInTheDocument()
  })
})
