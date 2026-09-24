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
  currentStepTitle: 'The landing zone',
  saveAsHome: false,
  foundInCurrentArea: false,
  pinCustomItem: false,
  onChange: vi.fn(),
  onFoundInCurrentArea: vi.fn(),
  onSaveAsHome: vi.fn(),
  onPinCustomItem: vi.fn(),
  onSave: vi.fn(),
  onBack: vi.fn(),
}

describe('FoundView', () => {
  it('makes the exact found place the only required detail', () => {
    render(<FoundView {...baseProps} value="" />)

    expect(screen.getByRole('heading', { name: 'There it is.' })).toBeInTheDocument()
    expect(screen.getByText('Did “The landing zone” help you find it?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'No, found another way' })).toHaveAttribute('aria-pressed', 'true')
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
    fireEvent.click(screen.getByRole('button', { name: 'Yes, this step' }))
    expect(baseProps.onFoundInCurrentArea).toHaveBeenCalledWith(true)
  })

  it('asks only for the exact location when no trail step is on screen', () => {
    render(<FoundView {...baseProps} currentStepTitle={undefined} value="" />)

    expect(screen.queryByRole('group', { name: /help you find it/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Entry table or hook' })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Exact place' })).toHaveValue('')
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
