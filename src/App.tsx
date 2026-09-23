import { useEffect, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { CalmReset } from './components/CalmReset'
import { CompleteView, FoundView } from './components/FoundView'
import type { FoundSummary } from './components/FoundView'
import { HistoryView } from './components/HistoryView'
import { HomeArtwork } from './components/HomeArtwork'
import { Icon } from './components/Icon'
import { canShowIOSInstallInstructions, IOSInstallCoach } from './components/IOSInstallCoach'
import { Onboarding, shouldShowOnboarding } from './components/Onboarding'
import { SettingsView } from './components/SettingsView'
import { StillMissingView } from './components/StillMissingView'
import { TrailView } from './components/TrailView'
import { WidenSearchView } from './components/WidenSearchView'
import { ITEMS, ITEM_BY_ID } from './data'
import { buildTrail, compactActiveSearch, getWiderStartIndex, isFocusedPassComplete } from './trailEngine'
import { createActiveSearch, itemIdentity, loadData, parseBackup, saveData, serializeBackup } from './storage'
import type { ActiveSearch, ClueOption, ClueQuestion, FoundEntry, ItemId, PersistedData, SavedItem, Screen, Settings } from './types'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

function stamp(search: ActiveSearch): ActiveSearch {
  return { ...search, lastUpdatedAt: new Date().toISOString() }
}

function secondsBetween(start: string, end = new Date()): number {
  const value = Math.round((end.getTime() - Date.parse(start)) / 1000)
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

function shouldReduceMotion(settings: Settings): boolean {
  return settings.motion === 'reduced'
    || (settings.motion === 'system' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))
}

export default function App() {
  const [data, setData] = useState<PersistedData>(() => {
    const loaded = loadData()
    return loaded.activeSearch ? { ...loaded, activeSearch: compactActiveSearch(loaded.activeSearch) } : loaded
  })
  const [screen, setScreen] = useState<Screen>(() => new URLSearchParams(window.location.search).get('screen') === 'calm' ? 'calm' : 'home')
  const [clueIndex, setClueIndex] = useState(0)
  const [customOpen, setCustomOpen] = useState(false)
  const [customName, setCustomName] = useState('')
  const [foundLocation, setFoundLocation] = useState('')
  const [saveAsHome, setSaveAsHome] = useState(false)
  const [pinCustomItem, setPinCustomItem] = useState(true)
  const [foundSummary, setFoundSummary] = useState<FoundSummary | null>(null)
  const [returnScreen, setReturnScreen] = useState<Screen>('home')
  const [storageError, setStorageError] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [updateWorker, setUpdateWorker] = useState<ServiceWorker | null>(null)
  const [backupStatus, setBackupStatus] = useState<{ message: string; kind: 'success' | 'error' } | null>(null)
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null)
  const [onboardingOpen, setOnboardingOpen] = useState(() => shouldShowOnboarding())
  const [iosInstallHelpRequest, setIosInstallHelpRequest] = useState(0)
  const previousScreen = useRef(screen)
  const focusItemPickerOnHome = useRef(false)
  const onboardingWasOpen = useRef(onboardingOpen)

  const active = data.activeSearch
  const activeItem = active ? ITEM_BY_ID[active.itemId] : null

  useEffect(() => {
    if (!saveData(data)) setStorageError(true)
  }, [data])

  useEffect(() => {
    const onlineHandler = () => setOnline(true)
    const offlineHandler = () => setOnline(false)
    const installHandler = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    window.addEventListener('online', onlineHandler)
    window.addEventListener('offline', offlineHandler)
    window.addEventListener('beforeinstallprompt', installHandler)
    return () => {
      window.removeEventListener('online', onlineHandler)
      window.removeEventListener('offline', offlineHandler)
      window.removeEventListener('beforeinstallprompt', installHandler)
    }
  }, [])

  useEffect(() => {
    const updateHandler = (event: Event) => {
      const worker = (event as CustomEvent<{ worker: ServiceWorker }>).detail?.worker
      if (worker) setUpdateWorker(worker)
    }
    window.addEventListener('findtrail:update-ready', updateHandler)
    return () => window.removeEventListener('findtrail:update-ready', updateHandler)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.motion = data.settings.motion
    document.documentElement.dataset.textSize = data.settings.textSize
  }, [data.settings])

  useEffect(() => {
    if (previousScreen.current !== screen) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      const focusPicker = screen === 'home' && focusItemPickerOnHome.current
      focusItemPickerOnHome.current = false
      window.setTimeout(() => {
        document.getElementById(focusPicker ? 'item-picker-heading' : 'view-heading')?.focus({ preventScroll: true })
        if (focusPicker) {
          const picker = document.getElementById('item-picker')
          picker?.classList.add('is-reentry')
          window.setTimeout(() => picker?.classList.remove('is-reentry'), 900)
        }
      }, 0)
      previousScreen.current = screen
    }
  }, [screen])

  useEffect(() => {
    if (onboardingWasOpen.current && !onboardingOpen) {
      window.setTimeout(() => document.getElementById('view-heading')?.focus({ preventScroll: true }), 0)
    }
    onboardingWasOpen.current = onboardingOpen
  }, [onboardingOpen])

  function navigate(next: Screen) {
    if (next === 'calm') setReturnScreen(active?.stops.length ? 'trail' : 'home')
    setHistoryEntryId(null)
    setScreen(next)
  }

  function openHistoryEntry(id: string) {
    setHistoryEntryId(id)
    setScreen('history')
  }

  function updateActive(updater: (current: ActiveSearch) => ActiveSearch) {
    setData((current) => current.activeSearch ? { ...current, activeSearch: stamp(updater(current.activeSearch)) } : current)
  }

  function startSearch(itemId: ItemId, label?: string) {
    const item = ITEM_BY_ID[itemId]
    const itemLabel = label?.trim() || item.shortLabel
    if (data.activeSearch && !window.confirm(`Replace the current ${data.activeSearch.itemLabel} search with a new one?`)) return
    setData((current) => ({ ...current, activeSearch: createActiveSearch(itemId, itemLabel) }))
    setClueIndex(0)
    setFoundSummary(null)
    setFoundLocation('')
    setCustomOpen(false)
    setCustomName('')
    setScreen('clues')
  }

  function answersThroughCurrentClue(value: string): Record<string, string> | null {
    if (!active || !activeItem) return null
    const question = activeItem.questions[clueIndex]
    const answers = activeItem.questions.slice(0, clueIndex).reduce<Record<string, string>>((next, previousQuestion) => {
      const previousAnswer = active.answers[previousQuestion.id]
      return previousAnswer ? { ...next, [previousQuestion.id]: previousAnswer } : next
    }, {})
    return { ...answers, [question.id]: value }
  }

  function saveClueAnswer(value: string) {
    const answers = answersThroughCurrentClue(value)
    if (!answers) return
    updateActive((current) => ({ ...current, answers, stops: [], currentIndex: 0, checkedSpots: {} }))
  }

  function answerClue(value: string) {
    const answers = answersThroughCurrentClue(value)
    if (!answers || !activeItem || clueIndex >= activeItem.questions.length - 1) return
    updateActive((current) => ({ ...current, answers, stops: [], currentIndex: 0, checkedSpots: {} }))
    setClueIndex((current) => current + 1)
  }

  function completeClues(value: string) {
    if (!active) return
    const answers = answersThroughCurrentClue(value)
    if (!answers) return
    const stops = buildTrail(active.itemId, active.itemLabel, answers, data.history, data.savedItems)
    updateActive((current) => ({ ...current, answers, stops, currentIndex: 0, checkedSpots: {} }))
    setScreen('trail')
  }

  function resumeSearch() {
    if (!active) return
    if (active.stops.length) {
      setScreen(isFocusedPassComplete(active.stops, active.currentIndex) ? 'widen' : 'trail')
      return
    }
    const questions = ITEM_BY_ID[active.itemId].questions
    const nextUnanswered = questions.findIndex((question) => !active.answers[question.id])
    setClueIndex(nextUnanswered < 0 ? questions.length - 1 : nextUnanswered)
    setScreen('clues')
  }

  function toggleSpot(spot: string) {
    if (!active?.stops[active.currentIndex]) return
    const stopId = active.stops[active.currentIndex].id
    updateActive((current) => {
      const existing = current.checkedSpots[stopId] ?? []
      const next = existing.includes(spot) ? existing.filter((value) => value !== spot) : [...existing, spot]
      return { ...current, checkedSpots: { ...current.checkedSpots, [stopId]: next } }
    })
  }

  function nextStop() {
    if (!active) return
    if (isFocusedPassComplete(active.stops, active.currentIndex)) {
      setScreen('widen')
      return
    }
    if (active.currentIndex >= active.stops.length - 1) {
      setScreen('end')
      return
    }
    const nextIndex = active.currentIndex + 1
    updateActive((current) => ({ ...current, currentIndex: nextIndex }))
    if (data.settings.calmPause && nextIndex > 0 && nextIndex % 3 === 0) {
      setReturnScreen('trail')
      setScreen('calm')
    }
  }

  function widenSearch() {
    if (!active) return
    const nextIndex = getWiderStartIndex(active.stops)
    if (nextIndex === null) {
      setScreen('trail')
      return
    }
    updateActive((current) => ({ ...current, currentIndex: nextIndex }))
    setScreen('trail')
  }

  function openFound() {
    const stop = active?.stops[active.currentIndex]
    const checked = stop ? active?.checkedSpots[stop.id] ?? [] : []
    setFoundLocation(checked.at(-1) ?? '')
    setSaveAsHome(false)
    setPinCustomItem(true)
    setScreen('found')
  }

  function saveFound() {
    if (!active || !foundLocation.trim()) return
    const now = new Date()
    const durationSeconds = secondsBetween(active.startedAt, now)
    const entry: FoundEntry = {
      id: crypto.randomUUID?.() ?? `${Date.now()}`,
      itemId: active.itemId,
      itemLabel: active.itemLabel,
      foundLocation: foundLocation.trim(),
      foundAt: now.toISOString(),
      answers: active.answers,
      stopsChecked: active.currentIndex + 1,
      durationSeconds,
      foundStopId: active.stops[active.currentIndex]?.id,
      foundSpot: foundLocation.trim(),
    }
    setFoundSummary({
      itemId: active.itemId,
      itemLabel: active.itemLabel,
      location: entry.foundLocation,
      seconds: durationSeconds,
      stopsChecked: entry.stopsChecked,
      savedAsHome: saveAsHome,
    })
    setData((current) => {
      let savedItems = current.savedItems
      if (saveAsHome) {
        const id = itemIdentity(active.itemId, active.itemLabel)
        const existing = savedItems.find((item) => item.id === id)
        const saved: SavedItem = {
          id,
          itemId: active.itemId,
          itemLabel: active.itemLabel,
          homeSpot: entry.foundLocation,
          pinned: active.itemId === 'other' ? pinCustomItem : false,
          createdAt: existing?.createdAt ?? now.toISOString(),
          updatedAt: now.toISOString(),
        }
        savedItems = [saved, ...savedItems.filter((item) => item.id !== id)]
      }
      return { ...current, history: [entry, ...current.history].slice(0, 100), savedItems, activeSearch: null }
    })
    setScreen('complete')
  }

  function discardActive() {
    if (!active || !window.confirm(`End the current ${active.itemLabel} search? Your found-item history will stay.`)) return
    setData((current) => ({ ...current, activeSearch: null }))
    setScreen('home')
  }

  function updateSettings(next: Partial<Settings>) {
    setData((current) => ({ ...current, settings: { ...current.settings, ...next } }))
  }

  function clearHistory() {
    if (!data.history.length || !window.confirm('Clear all found-item history from this device? This cannot be undone.')) return
    setData((current) => ({ ...current, history: [] }))
  }

  function updateSavedItem(id: string, next: Partial<Pick<SavedItem, 'homeSpot' | 'pinned'>>) {
    setData((current) => ({
      ...current,
      savedItems: current.savedItems.map((item) => item.id === id
        ? { ...item, ...next, homeSpot: next.homeSpot ?? item.homeSpot, updatedAt: new Date().toISOString() }
        : item),
    }))
  }

  function removeSavedItem(id: string) {
    const item = data.savedItems.find((entry) => entry.id === id)
    if (!item || !window.confirm(`Forget the saved home for ${item.itemLabel}? Found history will stay.`)) return
    setData((current) => ({ ...current, savedItems: current.savedItems.filter((entry) => entry.id !== id) }))
  }

  function exportBackup() {
    const blob = new Blob([serializeBackup(data)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `findtrail-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    setBackupStatus({ message: 'Backup downloaded.', kind: 'success' })
  }

  async function restoreBackup(file: File) {
    setBackupStatus(null)
    let contents: string
    try {
      contents = await file.text()
    } catch {
      setBackupStatus({ message: 'The backup file could not be read.', kind: 'error' })
      return
    }
    const parsed = parseBackup(contents)
    if (!parsed.ok) {
      setBackupStatus({ message: parsed.error, kind: 'error' })
      return
    }
    const summary = `${parsed.data.history.length} found ${parsed.data.history.length === 1 ? 'place' : 'places'} and ${parsed.data.savedItems.length} saved ${parsed.data.savedItems.length === 1 ? 'home' : 'homes'}`
    if (!window.confirm(`Restore ${summary}? This will replace the FindTrail data on this device.`)) return
      setData(parsed.data.activeSearch ? { ...parsed.data, activeSearch: compactActiveSearch(parsed.data.activeSearch) } : parsed.data)
    setBackupStatus({ message: 'Backup restored.', kind: 'success' })
  }

  function applyUpdate() {
    updateWorker?.postMessage({ type: 'SKIP_WAITING' })
  }

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  function findAnotherItem() {
    focusItemPickerOnHome.current = true
    setScreen('home')
  }

  const rootScreen = ['home', 'history', 'settings'].includes(screen)
  const iosInstallHelpAvailable = canShowIOSInstallInstructions()

  if (onboardingOpen) {
    return <Onboarding onComplete={() => setOnboardingOpen(false)} />
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-content">Skip to content</a>
      <IOSInstallCoach requestKey={iosInstallHelpRequest} />
      {!online && <div className="offline-banner" role="status">Offline mode · your saved trail still works</div>}
      {updateWorker && rootScreen && <div className="update-banner" role="status"><span><strong>FindTrail update ready</strong><small>Your trail is saved. Reload when you are ready.</small></span><button onClick={applyUpdate}>Update now</button><button onClick={() => setUpdateWorker(null)} aria-label="Remind me later"><Icon name="close" size={16} /></button></div>}
      {storageError && <div className="storage-banner" role="alert">This browser blocked saving. Keep this tab open until your search is finished.<button onClick={() => setStorageError(false)} aria-label="Dismiss"><Icon name="close" size={17} /></button></div>}
      <main id="app-content" className={rootScreen ? 'app-content app-content--with-nav' : 'app-content'}>
        {screen === 'home' && <HomeView data={data} customOpen={customOpen} customName={customName} setCustomOpen={setCustomOpen} setCustomName={setCustomName} onStart={startSearch} onResume={resumeSearch} onDiscard={discardActive} onOpenHistory={openHistoryEntry} />}
        {screen === 'clues' && active && activeItem && <ClueView search={active} settings={data.settings} question={activeItem.questions[clueIndex]} index={clueIndex} total={activeItem.questions.length} onAnswer={answerClue} onSave={saveClueAnswer} onComplete={completeClues} onBack={() => clueIndex === 0 ? setScreen('home') : setClueIndex((value) => value - 1)} />}
        {screen === 'trail' && active && active.stops[active.currentIndex] && <TrailView search={active} settings={data.settings} onBack={() => setScreen('home')} onToggleSpot={toggleSpot} onNext={nextStop} onFound={openFound} onCalm={() => { setReturnScreen('trail'); setScreen('calm') }} onEditClues={() => { setClueIndex(0); setScreen('clues') }} />}
        {screen === 'widen' && active && <WidenSearchView search={active} onWiden={widenSearch} onFound={openFound} onReset={() => { setReturnScreen('widen'); setScreen('calm') }} onHome={() => setScreen('home')} />}
        {screen === 'found' && active && <FoundView search={active} value={foundLocation} saveAsHome={saveAsHome} pinCustomItem={pinCustomItem} onChange={setFoundLocation} onSaveAsHome={setSaveAsHome} onPinCustomItem={setPinCustomItem} onSave={saveFound} onBack={() => setScreen('trail')} />}
        {screen === 'complete' && foundSummary && <CompleteView summary={foundSummary} durationLabel={formatDuration(foundSummary.seconds)} onHome={() => setScreen('home')} onAnother={findAnotherItem} />}
        {screen === 'history' && <HistoryView history={data.history} initialEntryId={historyEntryId} onStart={startSearch} />}
        {screen === 'calm' && <CalmReset hasSearch={Boolean(active?.stops.length)} motion={data.settings.motion} onResume={() => setScreen(returnScreen === 'trail' && !active ? 'home' : returnScreen)} />}
        {screen === 'settings' && <SettingsView data={data} canInstall={Boolean(installPrompt)} iosInstallHelpAvailable={iosInstallHelpAvailable} backupStatus={backupStatus} onUpdate={updateSettings} onUpdateSavedItem={updateSavedItem} onRemoveSavedItem={removeSavedItem} onInstall={installApp} onShowIOSInstallHelp={() => setIosInstallHelpRequest((value) => value + 1)} onExport={exportBackup} onRestore={restoreBackup} onClear={clearHistory} />}
        {screen === 'end' && active && <StillMissingView search={active} onFound={openFound} onReset={() => { setReturnScreen('end'); setScreen('calm') }} onRestart={() => { updateActive((current) => ({ ...current, currentIndex: 0, checkedSpots: {} })); setScreen('trail') }} onHome={() => setScreen('home')} />}
      </main>
      {rootScreen && <BottomNav active={screen} onNavigate={navigate} />}
    </div>
  )
}

interface HomeViewProps {
  data: PersistedData
  customOpen: boolean
  customName: string
  setCustomOpen: (value: boolean) => void
  setCustomName: (value: string) => void
  onStart: (itemId: ItemId, label?: string) => void
  onResume: () => void
  onDiscard: () => void
  onOpenHistory: (id: string) => void
}

function HomeView({ data, customOpen, customName, setCustomOpen, setCustomName, onStart, onResume, onDiscard, onOpenHistory }: HomeViewProps) {
  const latest = data.history[0]
  const pinnedItems = data.savedItems.filter((item) => item.itemId === 'other' && item.pinned)
  const [departingItemId, setDepartingItemId] = useState<ItemId | null>(null)
  const handoffTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (handoffTimer.current !== null) window.clearTimeout(handoffTimer.current)
  }, [])

  function chooseItem(itemId: ItemId) {
    if (handoffTimer.current !== null) return
    if (itemId === 'other') {
      setCustomOpen(!customOpen)
      return
    }

    if (shouldReduceMotion(data.settings)) {
      onStart(itemId)
      return
    }

    setDepartingItemId(itemId)
    handoffTimer.current = window.setTimeout(() => {
      handoffTimer.current = null
      onStart(itemId)
    }, 170)
  }

  return (
    <section className={data.activeSearch ? 'view home-view home-view--active' : 'view home-view'} aria-labelledby="view-heading">
      <header className="brand-header">
        <div className="brand-lockup"><span className="brand-mark"><Icon name="trail" /></span><strong>FindTrail</strong></div>
        <span className="local-pill"><Icon name="lock" size={13} />Private on this device</span>
      </header>

      <div className="home-main">
        <section className="home-hero">
          <HomeArtwork />

          {data.activeSearch ? (
            <article className="resume-card">
              <div className="resume-card__icon"><Icon name={ITEM_BY_ID[data.activeSearch.itemId].icon} /></div>
              <div>
                <span>Trail in progress</span>
                <h1 id="view-heading" tabIndex={-1}>Keep looking for {data.activeSearch.itemLabel.toLocaleLowerCase()}?</h1>
                <p>{data.activeSearch.stops.length ? `Ready at stop ${data.activeSearch.currentIndex + 1}.` : 'Your clues are saved.'}</p>
              </div>
              <button className="button button--primary" onClick={onResume}>Resume trail</button>
              <button className="text-button text-button--muted" onClick={onDiscard}>End this search</button>
            </article>
          ) : (
            <div className="hero-copy">
              <h1 id="view-heading" tabIndex={-1} aria-label="A clear path to finding what’s missing.">A clear path to <em>finding what’s missing.</em></h1>
              <p>Choose what’s missing. FindTrail organizes your search and keeps you moving toward the next likely place.</p>
            </div>
          )}
        </section>

        <div id="item-picker" className="item-picker">
          <div className="section-heading">
            <h2 id="item-picker-heading" tabIndex={-1}>What went missing?</h2>
            <small>One tap</small>
          </div>
          {pinnedItems.length > 0 && <div className="pinned-items" role="group" aria-label="Pinned items">
            {pinnedItems.map((item) => <button key={item.id} className="pinned-item" onClick={() => onStart('other', item.itemLabel)}><Icon name="pin" size={15} /><span>{item.itemLabel}</span></button>)}
          </div>}
          <div className="item-grid">
            {ITEMS.map((item) => {
              const itemClass = [
                'item-button',
                item.id === 'other' && customOpen ? 'is-active' : '',
                item.id === departingItemId ? 'is-departing' : '',
              ].filter(Boolean).join(' ')
              return (
                <button key={item.id} className={itemClass} onClick={() => chooseItem(item.id)} aria-haspopup={item.id === 'other' ? 'dialog' : undefined} aria-expanded={item.id === 'other' ? customOpen : undefined}>
                  <span className="item-button__icon"><Icon name={item.icon} size={23} /></span>
                  <strong>{item.label}</strong>
                  <small>{item.hint}</small>
                </button>
              )
            })}
          </div>
        </div>

        {!data.activeSearch && (latest ? (
          <button className="recent-card" onClick={() => onOpenHistory(latest.id)} aria-label={`Open ${latest.itemLabel}, found at ${latest.foundLocation}, in history`}>
            <span className="recent-card__icon"><Icon name="history" size={23} /></span>
            <span className="recent-card__copy"><small>Last found</small><strong>{latest.itemLabel}</strong><span>{latest.foundLocation}</span></span>
            <span className="recent-card__arrow"><Icon name="forward" size={20} /></span>
          </button>
        ) : (
          <div className="recent-card recent-card--empty">
            <span className="recent-card__icon"><Icon name="trail" size={23} /></span>
            <span className="recent-card__copy"><small>Your first trail</small><strong>Ready when you are.</strong><span>Recent finds will appear here.</span></span>
          </div>
        ))}
      </div>

      {customOpen && (
        <div className="custom-item-scrim" onMouseDown={(event) => { if (event.currentTarget === event.target) setCustomOpen(false) }}>
          <form className="custom-item" role="dialog" aria-modal="true" aria-label="Custom item" onKeyDown={(event) => { if (event.key === 'Escape') setCustomOpen(false) }} onSubmit={(event) => { event.preventDefault(); if (customName.trim()) onStart('other', customName) }}>
            <div className="custom-item__heading"><div><span className="eyebrow">Other item</span><h2 id="custom-item-heading">What are we finding?</h2></div><button type="button" className="icon-button" onClick={() => setCustomOpen(false)} aria-label="Close custom item"><Icon name="close" size={19} /></button></div>
            <label htmlFor="custom-name">What are we finding?</label>
            <input id="custom-name" value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="Example: work badge" autoFocus maxLength={40} />
            <button className="button button--primary button--wide" disabled={!customName.trim()}>Start a trail</button>
          </form>
        </div>
      )}
    </section>
  )
}

const ACTION_ORDER_BY_PLACE: Record<string, string[]> = {
  home: ['arrived', 'changed', 'sat', 'cleaned', 'carried', 'unsure'],
  car: ['arrived', 'carried', 'sat', 'changed', 'cleaned', 'unsure'],
  work: ['arrived', 'carried', 'sat', 'cleaned', 'changed', 'unsure'],
  out: ['carried', 'arrived', 'sat', 'changed', 'cleaned', 'unsure'],
  unsure: ['arrived', 'changed', 'sat', 'carried', 'cleaned', 'unsure'],
}

const ACTION_TITLE_BY_PLACE: Record<string, string> = {
  home: 'At home, what happened next?',
  car: 'After the car, what happened next?',
  work: 'At work, what happened next?',
  out: 'While you were out, what happened next?',
  unsure: 'What happened around that time?',
}

function ClueView({ search, settings, question, index, total, onAnswer, onSave, onComplete, onBack }: { search: ActiveSearch; settings: Settings; question: ClueQuestion; index: number; total: number; onAnswer: (value: string) => void; onSave: (value: string) => void; onComplete: (value: string) => void; onBack: () => void }) {
  const [selectedValue, setSelectedValue] = useState<string | null>(() => search.answers[question.id] ?? null)
  const [moreOpen, setMoreOpen] = useState(false)
  const selectionTimer = useRef<number | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const item = ITEM_BY_ID[search.itemId]
  const isFinal = index === total - 1
  const itemAnswer = item.questions[0]?.options.find((option) => option.value === search.answers.itemDetail)?.label
  const lastPlaceAnswer = item.questions.find((entry) => entry.id === 'lastPlace')?.options.find((option) => option.value === search.answers.lastPlace)?.label
  const contextItem = itemAnswer ?? search.itemLabel
  const pronoun = search.itemId === 'keys' || search.itemId === 'glasses' ? 'them' : 'it'
  const title = question.id === 'lastPlace'
    ? `Where do you last remember having ${pronoun}?`
    : question.id === 'lastAction'
      ? ACTION_TITLE_BY_PLACE[search.answers.lastPlace] ?? question.title
      : question.title
  const optionOrder = question.id === 'lastAction' ? ACTION_ORDER_BY_PLACE[search.answers.lastPlace] ?? ACTION_ORDER_BY_PLACE.unsure : []
  const orderedOptions = question.id === 'lastAction'
    ? [...question.options].sort((a, b) => optionOrder.indexOf(a.value) - optionOrder.indexOf(b.value))
    : question.options
  const primaryOptions = question.id === 'lastAction' ? orderedOptions.slice(0, 4) : orderedOptions
  const extraOptions = question.id === 'lastAction' ? orderedOptions.slice(4) : []
  const selectedLabel = orderedOptions.find((option) => option.value === selectedValue)?.label
  const stepLabels = [itemAnswer ?? 'Item', lastPlaceAnswer ?? 'Place', selectedValue && isFinal ? 'Trail ready' : 'What changed']

  useEffect(() => {
    const savedAnswer = search.answers[question.id] ?? null
    setSelectedValue(savedAnswer)
    setMoreOpen(Boolean(savedAnswer && extraOptions.some((option) => option.value === savedAnswer)))
    headingRef.current?.focus({ preventScroll: true })
    return () => {
      if (selectionTimer.current !== null) window.clearTimeout(selectionTimer.current)
      selectionTimer.current = null
    }
  }, [question.id])

  function chooseAnswer(value: string) {
    if (selectionTimer.current !== null) return
    setSelectedValue(value)
    if (isFinal) {
      onSave(value)
      return
    }
    if (shouldReduceMotion(settings)) {
      onAnswer(value)
      return
    }
    selectionTimer.current = window.setTimeout(() => {
      selectionTimer.current = null
      onAnswer(value)
    }, 220)
  }

  function renderOption(option: ClueOption) {
    const selected = selectedValue !== null ? selectedValue === option.value : search.answers[question.id] === option.value
    return (
      <button key={option.value} type="button" className={selected ? 'choice-button is-selected' : 'choice-button'} aria-pressed={selected} onClick={() => chooseAnswer(option.value)}>
        <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
        <span className="choice-button__marker" aria-hidden="true">{selected ? <Icon name="check" size={17} /> : <span />}</span>
      </button>
    )
  }

  return (
    <section className="view clue-view" aria-labelledby="view-heading">
      <header className="topbar">
        <button className="icon-button" onClick={onBack} aria-label="Go back"><Icon name="back" /></button>
        <div className="topbar__trail"><span>Building a trail for {search.itemLabel.toLocaleLowerCase()}</span><strong>Clue {index + 1} of {total}</strong></div>
        <span />
      </header>
      <ol className="clue-route" aria-label={`Clue ${index + 1} of ${total}`}>
        {Array.from({ length: total }).map((_, value) => <li key={value} className={value < index ? 'is-complete' : value === index ? 'is-current' : ''} aria-current={value === index ? 'step' : undefined}><span>{value < index ? <Icon name="check" size={13} /> : value + 1}</span><small>{stepLabels[value]}</small></li>)}
      </ol>
      <article className="clue-panel">
        <div className={lastPlaceAnswer ? 'clue-context clue-context--two' : 'clue-context'} aria-label="Clues collected so far">
          <span className="clue-context__icon"><Icon name={item.icon} size={20} /></span>
          <span className="clue-context__entry"><small>Looking for</small><strong>{contextItem}</strong></span>
          {lastPlaceAnswer && <><span className="clue-context__connector"><Icon name="forward" size={14} /></span><span className="clue-context__entry"><small>Last place</small><strong>{lastPlaceAnswer}</strong></span></>}
        </div>
        <div className="clue-copy">
          <h1 ref={headingRef} id="view-heading" tabIndex={-1}>{title}</h1>
          <p>{question.helper}</p>
        </div>
        <div className="choice-group" role="group" aria-labelledby="view-heading">
          <div className="choice-list">{primaryOptions.map(renderOption)}</div>
          {extraOptions.length > 0 && <button type="button" className="choice-more" aria-expanded={moreOpen} aria-controls="more-clue-options" onClick={() => setMoreOpen((open) => !open)}>{moreOpen ? 'Show fewer choices' : 'More possibilities or not sure'}<Icon name={moreOpen ? 'close' : 'forward'} size={16} /></button>}
          {moreOpen && extraOptions.length > 0 && <div id="more-clue-options" className="choice-list choice-list--extra">{extraOptions.map(renderOption)}</div>}
        </div>
        {isFinal ? (
          <div className="clue-finish">
            <p className="clue-finish__summary" aria-live="polite"><Icon name="trail" size={17} />{selectedLabel ? <span><small>Trail ready from</small><strong>{contextItem} · {lastPlaceAnswer} · {selectedLabel}</strong></span> : <span><small>Last step</small><strong>Choose the closest answer above.</strong></span>}</p>
            <button type="button" className="button button--primary button--wide" aria-label="Build my search trail" disabled={!selectedValue} onClick={() => selectedValue && onComplete(selectedValue)}>Build my trail<Icon name="forward" size={18} /></button>
          </div>
        ) : <p className="reassurance"><Icon name="calm" size={17} /> No perfect remembering required. Pick the closest answer and keep moving.</p>}
      </article>
    </section>
  )
}
