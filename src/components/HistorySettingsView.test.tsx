import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../storage'
import type { FoundEntry, PersistedData } from '../types'
import { HistoryView } from './HistoryView'
import { SettingsView } from './SettingsView'

const history: FoundEntry[] = [
  {
    id: 'keys-new', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Blue bowl', foundAt: '2026-09-20T12:00:00.000Z',
    answers: {}, stopsChecked: 2, durationSeconds: 75,
  },
  {
    id: 'wallet', itemId: 'wallet', itemLabel: 'Wallet', foundLocation: 'Work bag', foundAt: '2026-09-19T12:00:00.000Z',
    answers: {}, stopsChecked: 4, durationSeconds: 180,
  },
  {
    id: 'keys-old', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Blue bowl', foundAt: '2026-09-18T12:00:00.000Z',
    answers: {}, stopsChecked: 1, durationSeconds: 40,
  },
]

const data: PersistedData = {
  version: 3,
  activeSearch: null,
  settings: DEFAULT_SETTINGS,
  history,
  savedItems: [{
    id: 'other:badge', itemId: 'other', itemLabel: 'Work badge', homeSpot: 'Entry tray', pinned: false,
    createdAt: '2026-09-18T12:00:00.000Z', updatedAt: '2026-09-18T12:00:00.000Z',
  }],
}

describe('HistoryView', () => {
  const actions = { onHome: vi.fn(), onUpdateEntry: vi.fn(), onRemoveEntry: vi.fn() }
  it('turns found history into useful item patterns and expandable records', () => {
    const onStart = vi.fn()
    render(<HistoryView history={history} initialEntryId="keys-new" onStart={onStart} {...actions} />)

    expect(screen.getByRole('heading', { name: 'What FindTrail remembers' })).toBeInTheDocument()
    expect(screen.getByLabelText('3 saved finds across 2 items')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Find Keys again. Most likely place: Blue bowl' })).toHaveTextContent('Found here 2 times')
    expect(screen.getAllByRole('button', { name: /open keys, found at blue bowl/i })[0]).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('1 min')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Find Keys again. Most likely place: Blue bowl' }))
    expect(onStart).toHaveBeenCalledWith('keys', 'Keys')
    fireEvent.click(screen.getByRole('button', { name: 'Correct place' }))
    fireEvent.change(screen.getByLabelText('Correct this place'), { target: { value: 'Hall shelf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }))
    expect(actions.onUpdateEntry).toHaveBeenCalledWith('keys-new', 'Hall shelf')
    fireEvent.click(screen.getByRole('button', { name: 'Remove this find' }))
    expect(actions.onRemoveEntry).toHaveBeenCalledWith('keys-new')
  })

  it('puts repeated learned locations ahead of newer one-off finds', () => {
    const rankedHistory: FoundEntry[] = [
      {
        id: 'wallet-new', itemId: 'wallet', itemLabel: 'Wallet', foundLocation: 'Kitchen counter', foundAt: '2026-09-22T12:00:00.000Z',
        answers: {}, stopsChecked: 1, durationSeconds: 30,
      },
      {
        id: 'phone-new', itemId: 'phone', itemLabel: 'Phone', foundLocation: 'Couch', foundAt: '2026-09-21T12:00:00.000Z',
        answers: {}, stopsChecked: 1, durationSeconds: 25,
      },
      {
        id: 'keys-two', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Blue bowl', foundAt: '2026-09-20T12:00:00.000Z',
        answers: {}, stopsChecked: 2, durationSeconds: 50,
      },
      {
        id: 'keys-one', itemId: 'keys', itemLabel: 'Keys', foundLocation: 'Blue bowl', foundAt: '2026-09-18T12:00:00.000Z',
        answers: {}, stopsChecked: 1, durationSeconds: 40,
      },
    ]

    render(<HistoryView history={rankedHistory} initialEntryId={null} onStart={vi.fn()} {...actions} />)
    const learnedPatterns = screen.getAllByRole('button', { name: /Most likely place:/i })

    expect(learnedPatterns[0]).toHaveAccessibleName('Find Keys again. Most likely place: Blue bowl')
    expect(learnedPatterns[0]).toHaveTextContent('Found here 2 times')
  })

  it('gives first use a private, purposeful empty state', () => {
    render(<HistoryView history={[]} initialEntryId={null} onStart={vi.fn()} {...actions} />)
    expect(screen.getByRole('heading', { name: 'No found places yet' })).toBeInTheDocument()
    expect(screen.getByText(/without sending that information anywhere/i)).toBeInTheDocument()
  })
})

describe('SettingsView', () => {
  it('organizes settings, saved homes, backups, and destructive data controls', () => {
    const onUpdate = vi.fn()
    const onUpdateSavedItem = vi.fn()
    const onRemoveSavedItem = vi.fn()
    const onExport = vi.fn()
    const onClear = vi.fn()

    render(<SettingsView
      data={data}
      canInstall={false}
      iosInstallHelpAvailable={false}
      backupStatus={{ message: 'Backup downloaded.', kind: 'success' }}
      onUpdate={onUpdate}
      onUpdateSavedItem={onUpdateSavedItem}
      onRemoveSavedItem={onRemoveSavedItem}
      onInstall={vi.fn()}
      onShowIOSInstallHelp={vi.fn()}
      onExport={onExport}
      onRestore={vi.fn()}
      onClear={onClear}
    />)

    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByText('3 saved finds · 1 saved home · no account or tracking')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /read new stops aloud/i }))
    expect(onUpdate).toHaveBeenCalledWith({ speakSteps: true })
    fireEvent.change(screen.getByLabelText('Motion'), { target: { value: 'reduced' } })
    expect(onUpdate).toHaveBeenCalledWith({ motion: 'reduced' })

    const homeInput = screen.getByLabelText('Home spot for Work badge')
    fireEvent.change(homeInput, { target: { value: 'Desk hook' } })
    fireEvent.blur(homeInput)
    expect(onUpdateSavedItem).toHaveBeenCalledWith('other:badge', { homeSpot: 'Desk hook' })
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }))
    expect(onUpdateSavedItem).toHaveBeenCalledWith('other:badge', { pinned: true })
    fireEvent.click(screen.getByRole('button', { name: 'Forget home' }))
    expect(onRemoveSavedItem).toHaveBeenCalledWith('other:badge')

    fireEvent.click(screen.getByRole('button', { name: 'Export backup' }))
    expect(onExport).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }))
    expect(onClear).toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('Backup downloaded.')
  })

  it('keeps iPhone Home Screen instructions available in Settings', () => {
    const onShowIOSInstallHelp = vi.fn()
    render(<SettingsView
      data={data}
      canInstall={false}
      iosInstallHelpAvailable={true}
      backupStatus={null}
      onUpdate={vi.fn()}
      onUpdateSavedItem={vi.fn()}
      onRemoveSavedItem={vi.fn()}
      onInstall={vi.fn()}
      onShowIOSInstallHelp={onShowIOSInstallHelp}
      onExport={vi.fn()}
      onRestore={vi.fn()}
      onClear={vi.fn()}
    />)

    fireEvent.click(screen.getByRole('button', { name: /Add FindTrail to Home Screen/i }))
    expect(onShowIOSInstallHelp).toHaveBeenCalledOnce()
  })

  it('presents failed restores as errors instead of success', () => {
    render(<SettingsView
      data={data}
      canInstall={false}
      iosInstallHelpAvailable={false}
      backupStatus={{ message: 'That backup is damaged.', kind: 'error' }}
      onUpdate={vi.fn()}
      onUpdateSavedItem={vi.fn()}
      onRemoveSavedItem={vi.fn()}
      onInstall={vi.fn()}
      onShowIOSInstallHelp={vi.fn()}
      onExport={vi.fn()}
      onRestore={vi.fn()}
      onClear={vi.fn()}
    />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('That backup is damaged.')
    expect(alert).toHaveClass('is-error')
  })

  it('keeps clearing disabled when there is no history', () => {
    render(<SettingsView
      data={{ ...data, history: [], savedItems: [] }}
      canInstall={false}
      iosInstallHelpAvailable={false}
      backupStatus={null}
      onUpdate={vi.fn()}
      onUpdateSavedItem={vi.fn()}
      onRemoveSavedItem={vi.fn()}
      onInstall={vi.fn()}
      onShowIOSInstallHelp={vi.fn()}
      onExport={vi.fn()}
      onRestore={vi.fn()}
      onClear={vi.fn()}
    />)
    expect(screen.getByText('No saved homes yet.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear history' })).toBeDisabled()
  })
})
