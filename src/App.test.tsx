import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { ONBOARDING_STORAGE_KEY } from './components/Onboarding'
import { DEFAULT_SETTINGS, STORAGE_KEY } from './storage'

async function buildTrailFromDoorway() {
  fireEvent.click(await screen.findByText('Went through a doorway'))
  fireEvent.click(screen.getByRole('button', { name: 'Build my search trail' }))
}

describe('FindTrail app', () => {
  beforeEach(() => {
    localStorage.clear()
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
    sessionStorage.clear()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })



  it('welcomes a genuinely new user before showing the home screen', () => {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY)
    render(<App />)

    expect(screen.getByRole('heading', { name: 'You lost something. Start with what you know.' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: 'A calm home scene for starting a FindTrail search' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))

    expect(screen.getByRole('heading', { name: 'A clear path to finding what’s missing.' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'A calm home scene for starting a FindTrail search' })).toBeInTheDocument()
    expect(document.querySelector('.home-artwork__trail')).not.toBeInTheDocument()
    expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('1')
  })

  it('keeps the home artwork static instead of implying search checkpoints', () => {
    render(<App />)
    expect(screen.getByRole('img', { name: 'A calm home scene for starting a FindTrail search' })).toBeInTheDocument()
    expect(document.querySelector('.home-artwork__trail')).not.toBeInTheDocument()
    expect(sessionStorage.getItem('findtrail:home-trail-played')).toBeNull()
  })

  it('hands the selected item smoothly into a focused trail', async () => {
    const transitionWait = { timeout: 6000 }
    render(<App />)
    expect(screen.getByText('Private on this device')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'A clear path to finding what’s missing.' })).toBeInTheDocument()
    const keysButton = screen.getByRole('button', { name: /keys/i })
    fireEvent.click(keysButton)
    expect(keysButton).toHaveClass('is-departing')
    expect(screen.queryByText('Car keys')).not.toBeInTheDocument()
    fireEvent.click(await screen.findByText('Car keys', {}, transitionWait))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Where do you last remember having them?' })).toHaveFocus(), transitionWait)
    fireEvent.click(screen.getByRole('button', { name: /At home/i }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'At home, what happened next?' })).toHaveFocus(), transitionWait)
    const doorway = screen.getByRole('button', { name: /Went through a doorway/i })
    fireEvent.click(doorway)
    expect(doorway).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('heading', { name: 'The landing zone' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Build my search trail' }))
    expect(await screen.findByRole('heading', { name: 'The landing zone' }, transitionWait)).toBeInTheDocument()
    expect(screen.getByText('Check one spot at a time')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Focused pass progress' })).toHaveAttribute('aria-valuetext', 'Place 1 of 3 in the focused pass')
  }, 10000)

  it('accepts a custom item name', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /other item/i }))
    fireEvent.change(screen.getByRole('textbox', { name: 'What are we finding?' }), { target: { value: 'Work badge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start a trail' }))
    expect(screen.getByText('Work badge')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How does this item usually travel?' })).toBeInTheDocument()
  })

  it('keeps the custom-item dialog keyboard focus inside and restores the trigger', () => {
    render(<App />)
    const trigger = screen.getByRole('button', { name: /other item/i })
    fireEvent.click(trigger)
    expect(document.querySelector('.home-main')).toHaveProperty('inert', true)
    const input = screen.getByRole('textbox', { name: 'What are we finding?' })
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, { key: 'Tab' })
    const close = screen.getByRole('button', { name: 'Close custom item' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(close, { key: 'Tab', shiftKey: true })
    expect(input).toHaveFocus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(trigger).toHaveFocus()
    expect(document.querySelector('.home-main')).not.toHaveProperty('inert', true)
  })

  it('saves a custom home spot, pins the item, and promotes that home next time', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /other item/i }))
    fireEvent.change(screen.getByRole('textbox', { name: 'What are we finding?' }), { target: { value: 'Work badge' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start a trail' }))
    fireEvent.click(screen.getByText('Carried in a hand'))
    fireEvent.click(await screen.findByText('At home'))
    await buildTrailFromDoorway()
    fireEvent.click(await screen.findByRole('button', { name: 'Found it' }))
    fireEvent.change(screen.getByLabelText('Exact place'), { target: { value: 'Entry tray' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /make this the home spot for work badge/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Save this found place' }))
    fireEvent.click(screen.getByRole('button', { name: 'Find another item' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'What went missing?' })).toHaveFocus())
    expect(document.getElementById('item-picker')).toHaveClass('is-reentry')

    const pinned = screen.getByRole('group', { name: 'Pinned items' })
    fireEvent.click(within(pinned).getByRole('button', { name: 'Work badge' }))
    fireEvent.click(screen.getByText('Carried in a hand'))
    fireEvent.click(await screen.findByText('At home'))
    await buildTrailFromDoorway()
    expect(await screen.findByRole('heading', { name: 'Its saved home' })).toBeInTheDocument()
    expect(screen.getByText(/start at entry tray/i)).toBeInTheDocument()
  })

  it('returns to the same trail after a reset', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(await screen.findByText('Car keys'))
    fireEvent.click(await screen.findByText('At home'))
    await buildTrailFromDoorway()
    fireEvent.click(await screen.findByRole('button', { name: 'I need a reset' }))
    expect(screen.getByRole('heading', { name: 'The search can wait one breath.' })).toBeInTheDocument()
    expect(screen.getByText('Breathe in as the feather rises and out as it drifts down. Tap Begin whenever you are ready.')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Mental reset progress' })).not.toBeInTheDocument()
    expect(screen.queryByText('Optional sound')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /begin 30-second reset/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /begin 30-second reset/i }))
    expect(screen.getByRole('progressbar', { name: 'Mental reset progress' })).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByRole('button', { name: /return to my trail/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    expect(screen.getByRole('heading', { name: 'The landing zone' })).toBeInTheDocument()
  })

  it('holds an update notice until the user returns to a root screen', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))

    render(<App />)
    act(() => window.dispatchEvent(new CustomEvent('findtrail:update-ready', { detail: { worker: { postMessage: vi.fn() } } })))
    expect(screen.getByText('FindTrail update ready')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(await screen.findByText('Car keys'))
    expect(screen.queryByText('FindTrail update ready')).not.toBeInTheDocument()

    fireEvent.click(await screen.findByText('At home'))
    await buildTrailFromDoorway()
    fireEvent.click(await screen.findByRole('button', { name: 'I need a reset' }))

    expect(screen.queryByText('FindTrail update ready')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /begin 30-second reset/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Skip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Return home' }))
    expect(screen.getByText('FindTrail update ready')).toBeInTheDocument()
  })

  it('carries the last checked spot into the found-place step', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(await screen.findByText('Car keys'))
    fireEvent.click(await screen.findByText('At home'))
    await buildTrailFromDoorway()
    fireEvent.click(await screen.findByRole('button', { name: 'Entry table or hook' }))
    fireEvent.click(screen.getByRole('button', { name: 'Found it' }))
    expect(screen.getByLabelText('Exact place')).toHaveValue('Entry table or hook')
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('learns a search area only after the finder confirms it', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3, activeSearch: null, settings: { ...DEFAULT_SETTINGS, motion: 'reduced' }, history: [], savedItems: [],
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(screen.getByText('Car keys'))
    fireEvent.click(screen.getByText('At home'))
    await buildTrailFromDoorway()
    fireEvent.click(screen.getByRole('button', { name: 'Found it' }))
    fireEvent.change(screen.getByLabelText('Exact place'), { target: { value: 'Blue bowl' } })
    expect(screen.getByRole('button', { name: 'No, found another way' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Save this found place' }))
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!)
    expect(saved.history[0].foundLocation).toBe('Blue bowl')
    expect(saved.history[0].foundStopId).toBeUndefined()
  })

  it('shows time-critical medicine guidance as soon as the urgent clue is selected', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3, activeSearch: null, settings: { ...DEFAULT_SETTINGS, motion: 'reduced' }, history: [], savedItems: [],
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /medicine/i }))
    fireEvent.click(screen.getByText('Urgent or rescue medicine'))
    expect(screen.getByRole('alert')).toHaveTextContent('contact a pharmacist, clinician, or trusted person now')
    fireEvent.click(screen.getByRole('button', { name: 'Continue the search with help' }))
    expect(screen.getByRole('heading', { name: 'Where do you last remember having it?' })).toBeInTheDocument()
  })

  it('turns the current area into visible, calm progress', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(screen.getByText('Car keys'))
    fireEvent.click(screen.getByText('At home'))
    await buildTrailFromDoorway()

    for (const spot of ['Entry table or hook', 'Beside the door', 'Near shoes', 'First counter inside']) {
      const button = screen.getByRole('button', { name: new RegExp(spot, 'i') })
      fireEvent.click(button)
      expect(button).toHaveAttribute('aria-pressed', 'true')
    }

    expect(screen.getByText('This area is fully checked. Move on when you’re ready.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Area checked · next place' }))
    expect(screen.getByRole('progressbar', { name: 'Focused pass progress' })).toHaveAttribute('aria-valuenow', '2')
  })

  it('resumes at the focused checkpoint and reveals only the next three places', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
      activeSearch: {
        version: 3,
        id: 'active-focused-checkpoint',
        itemId: 'keys',
        itemLabel: 'Keys',
        answers: { itemDetail: 'car', lastPlace: 'home', lastAction: 'arrived' },
        stops: [
          { id: 'entry', title: 'The landing zone', instruction: 'Check the landing zone.', spots: ['Entry hook'] },
          { id: 'pockets', title: 'Current pockets', instruction: 'Check pockets.', spots: ['Current pants'] },
          { id: 'counter', title: 'Flat surfaces', instruction: 'Check surfaces.', spots: ['Kitchen counter'] },
          { id: 'car', title: 'The car drop zones', instruction: 'Check the car.', spots: ['Console'] },
          { id: 'bags', title: 'Bags, one pocket at a time', instruction: 'Check bags.', spots: ['Work bag'] },
          { id: 'seat', title: 'Where you sat down', instruction: 'Check seating.', spots: ['Couch'] },
          { id: 'slow-sweep', title: 'Slow final sweep', instruction: 'Check slowly.', spots: ['Likeliest place'], kind: 'final' },
        ],
        currentIndex: 2,
        widenReady: true,
        checkedSpots: { entry: ['Entry hook'], pockets: ['Current pants'] },
        startedAt: '2026-09-22T12:00:00.000Z',
        lastUpdatedAt: '2026-09-22T12:05:00.000Z',
      },
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))

    expect(screen.getByRole('heading', { name: 'Pause before going wider.' })).toBeInTheDocument()
    const preview = screen.getByRole('list', { name: 'Next places to check for Keys' })
    expect(within(preview).getAllByRole('listitem')).toHaveLength(3)
    expect(within(preview).queryByText('Slow final sweep')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'I found it after all' }))
    expect(screen.queryByRole('group', { name: /help you find it/i })).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Exact place' })).toHaveValue('')
    fireEvent.click(screen.getByRole('button', { name: 'Back to search' }))

    fireEvent.click(screen.getByRole('button', { name: 'Search these 3 places' }))
    expect(screen.getByRole('heading', { name: 'The car drop zones' })).toBeInTheDocument()
    expect(screen.getByText('Place 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Wider pass progress' })).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByText('Want a 30-second reset?')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar', { name: 'Mental reset progress' })).not.toBeInTheDocument()
  })

  it('resumes an unfinished third place before offering the wider pass', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3, settings: { ...DEFAULT_SETTINGS, motion: 'reduced' }, history: [], savedItems: [],
      activeSearch: {
        version: 3, id: 'at-third', itemId: 'keys', itemLabel: 'Keys', answers: {},
        stops: [
          { id: 'drop-zone', title: 'The landing zone', instruction: 'Check here.', spots: ['Entry hook'] },
          { id: 'pockets', title: 'Current pockets', instruction: 'Check here.', spots: ['Pants'] },
          { id: 'counters', title: 'Flat surfaces', instruction: 'Check here.', spots: ['Counter'] },
          { id: 'car', title: 'The car drop zones', instruction: 'Check here.', spots: ['Console'] },
        ],
        currentIndex: 2, checkedSpots: {}, startedAt: '2026-09-22T12:00:00.000Z', lastUpdatedAt: '2026-09-22T12:05:00.000Z',
      },
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    expect(screen.getByRole('heading', { name: 'Flat surfaces' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Continue to wider search' }))
    expect(screen.getByRole('heading', { name: 'Pause before going wider.' })).toBeInTheDocument()
  })

  it('skips clue handoff delays when reduced motion is enabled', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(screen.getByText('Car keys'))
    expect(screen.getByText('At home')).toBeInTheDocument()
  })

  it('keeps the final clue focused and reveals less likely possibilities on request', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
    }))

    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /keys/i }))
    fireEvent.click(screen.getByText('Car keys'))
    fireEvent.click(screen.getByText('At home'))

    expect(screen.getByRole('heading', { name: 'At home, what happened next?' })).toBeInTheDocument()
    expect(screen.queryByText('Used a bag')).not.toBeInTheDocument()
    expect(screen.getByText('Not sure')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'More possibilities or not sure' }))
    expect(screen.getByText('Used a bag')).toBeInTheDocument()
  })

  it('turns the final stop into a clear recovery plan', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      settings: { ...DEFAULT_SETTINGS, motion: 'reduced' },
      history: [],
      savedItems: [],
      activeSearch: {
        version: 3,
        id: 'active-1',
        itemId: 'keys',
        itemLabel: 'Keys',
        answers: {},
        stops: [{ id: 'slow-sweep', title: 'Slow final sweep', instruction: 'Check slowly.', spots: ['Likeliest place'], kind: 'final' }],
        currentIndex: 0,
        checkedSpots: {},
        startedAt: '2026-09-14T12:00:00.000Z',
        lastUpdatedAt: '2026-09-14T12:00:00.000Z',
      },
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume trail' }))
    fireEvent.click(screen.getByRole('button', { name: 'Still missing · next steps' }))
    expect(screen.getByRole('heading', { name: 'Do one next move' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /30-second reset/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Trail explored.*1 area visited.*0 exact spots checked.*1 area skipped/i)).toBeInTheDocument()
  })

  it('announces an installed-app update and applies it on request', async () => {
    const postMessage = vi.fn()
    render(<App />)
    window.dispatchEvent(new CustomEvent('findtrail:update-ready', { detail: { worker: { postMessage } } }))
    expect(await screen.findByText('FindTrail update ready')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Update now' }))
    expect(postMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' })
  })

  it('fills the first-use home state without pretending there is history', () => {
    render(<App />)
    expect(screen.getByText('Your first trail')).toBeInTheDocument()
    expect(screen.getByText('Ready when you are.')).toBeInTheDocument()
    expect(screen.queryByText('Last found')).not.toBeInTheDocument()
  })

  it('opens the latest found entry from the home card', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: DEFAULT_SETTINGS,
      savedItems: [],
      history: [{
        id: 'history-1',
        itemId: 'keys',
        itemLabel: 'Keys',
        foundLocation: 'Blue bowl',
        foundAt: '2026-09-14T12:00:00.000Z',
        answers: {},
        stopsChecked: 2,
        durationSeconds: 90,
      }],
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /open keys, found at blue bowl, in history/i }))
    expect(screen.getByRole('heading', { name: 'What FindTrail remembers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open keys, found at blue bowl/i })).toHaveAttribute('aria-expanded', 'true')
  })

  it('requires confirmation before clearing found history', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 3,
      activeSearch: null,
      settings: DEFAULT_SETTINGS,
      savedItems: [],
      history: [{
        id: 'history-1',
        itemId: 'keys',
        itemLabel: 'Keys',
        foundLocation: 'Blue bowl',
        foundAt: '2026-09-14T12:00:00.000Z',
        answers: {},
        stopsChecked: 1,
        durationSeconds: 20,
      }],
    }))
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    fireEvent.click(screen.getByRole('button', { name: 'Clear history' }))
    expect(window.confirm).toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText('No found places yet')).toBeInTheDocument()
  })
})
