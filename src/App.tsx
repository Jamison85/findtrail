import { useEffect, useMemo, useRef, useState } from 'react'
import { BottomNav } from './components/BottomNav'
import { CalmReset } from './components/CalmReset'
import { HomeArtwork } from './components/HomeArtwork'
import { Icon } from './components/Icon'
import { Scenery } from './components/Scenery'
import { StillMissingView } from './components/StillMissingView'
import { TrailView } from './components/TrailView'
import { ITEMS, ITEM_BY_ID } from './data'
import { buildTrail, getFoundSuggestions, mostLikelyLocation } from './trailEngine'
import { createActiveSearch, itemIdentity, loadData, parseBackup, saveData, serializeBackup } from './storage'
import type { ActiveSearch, ClueQuestion, FoundEntry, ItemId, PersistedData, SavedItem, Screen, Settings } from './types'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface FoundSummary { itemLabel: string; location: string; seconds: number }

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

function dateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

function shouldReduceMotion(settings: Settings): boolean {
  return settings.motion === 'reduced'
    || (settings.motion === 'system' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false))
}

export default function App() {
  const [data, setData] = useState<PersistedData>(() => loadData())
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
  const [backupStatus, setBackupStatus] = useState('')
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null)
  const previousScreen = useRef(screen)

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
      window.setTimeout(() => document.getElementById('view-heading')?.focus({ preventScroll: true }), 0)
      previousScreen.current = screen
    }
  }, [screen])

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

  function answerClue(value: string) {
    if (!active || !activeItem) return
    const question = activeItem.questions[clueIndex]
    const answers = { ...active.answers, [question.id]: value }
    if (clueIndex < activeItem.questions.length - 1) {
      updateActive((current) => ({ ...current, answers }))
      setClueIndex((current) => current + 1)
      return
    }
    const stops = buildTrail(active.itemId, active.itemLabel, answers, data.history, data.savedItems)
    updateActive((current) => ({ ...current, answers, stops, currentIndex: 0, checkedSpots: {} }))
    setScreen('trail')
  }

  function resumeSearch() {
    if (!active) return
    if (active.stops.length) {
      setScreen('trail')
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
    setFoundSummary({ itemLabel: active.itemLabel, location: entry.foundLocation, seconds: durationSeconds })
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
    setBackupStatus('Backup downloaded.')
  }

  async function restoreBackup(file: File) {
    setBackupStatus('')
    let contents: string
    try {
      contents = await file.text()
    } catch {
      setBackupStatus('The backup file could not be read.')
      return
    }
    const parsed = parseBackup(contents)
    if (!parsed.ok) {
      setBackupStatus(parsed.error)
      return
    }
    const summary = `${parsed.data.history.length} found ${parsed.data.history.length === 1 ? 'place' : 'places'} and ${parsed.data.savedItems.length} saved ${parsed.data.savedItems.length === 1 ? 'home' : 'homes'}`
    if (!window.confirm(`Restore ${summary}? This will replace the FindTrail data on this device.`)) return
    setData(parsed.data)
    setBackupStatus('Backup restored.')
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

  const rootScreen = ['home', 'history', 'settings'].includes(screen)

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-content">Skip to content</a>
      {!online && <div className="offline-banner" role="status">Offline mode · your saved trail still works</div>}
      {updateWorker && <div className="update-banner" role="status"><span><strong>FindTrail update ready</strong><small>Your trail is saved. Reload when you are ready.</small></span><button onClick={applyUpdate}>Update now</button><button onClick={() => setUpdateWorker(null)} aria-label="Remind me later"><Icon name="close" size={16} /></button></div>}
      {storageError && <div className="storage-banner" role="alert">This browser blocked saving. Keep this tab open until your search is finished.<button onClick={() => setStorageError(false)} aria-label="Dismiss"><Icon name="close" size={17} /></button></div>}
      <main id="app-content" className={rootScreen ? 'app-content app-content--with-nav' : 'app-content'}>
        {screen === 'home' && <HomeView data={data} customOpen={customOpen} customName={customName} setCustomOpen={setCustomOpen} setCustomName={setCustomName} onStart={startSearch} onResume={resumeSearch} onDiscard={discardActive} onOpenHistory={openHistoryEntry} />}
        {screen === 'clues' && active && activeItem && <ClueView search={active} settings={data.settings} question={activeItem.questions[clueIndex]} index={clueIndex} total={activeItem.questions.length} onAnswer={answerClue} onBack={() => clueIndex === 0 ? setScreen('home') : setClueIndex((value) => value - 1)} />}
        {screen === 'trail' && active && active.stops[active.currentIndex] && <TrailView search={active} settings={data.settings} onBack={() => setScreen('home')} onToggleSpot={toggleSpot} onNext={nextStop} onFound={openFound} onCalm={() => { setReturnScreen('trail'); setScreen('calm') }} onEditClues={() => { setClueIndex(0); setScreen('clues') }} />}
        {screen === 'found' && active && <FoundView search={active} value={foundLocation} saveAsHome={saveAsHome} pinCustomItem={pinCustomItem} onChange={setFoundLocation} onSaveAsHome={setSaveAsHome} onPinCustomItem={setPinCustomItem} onSave={saveFound} onBack={() => setScreen('trail')} />}
        {screen === 'complete' && foundSummary && <CompleteView summary={foundSummary} onHome={() => setScreen('home')} onAnother={() => setScreen('home')} />}
        {screen === 'history' && <HistoryView history={data.history} initialEntryId={historyEntryId} onStart={startSearch} onClear={clearHistory} />}
        {screen === 'calm' && <CalmReset hasSearch={Boolean(active?.stops.length)} motion={data.settings.motion} onResume={() => setScreen(returnScreen === 'trail' && !active ? 'home' : returnScreen)} />}
        {screen === 'settings' && <SettingsView data={data} canInstall={Boolean(installPrompt)} backupStatus={backupStatus} onUpdate={updateSettings} onUpdateSavedItem={updateSavedItem} onRemoveSavedItem={removeSavedItem} onInstall={installApp} onExport={exportBackup} onRestore={restoreBackup} onClear={clearHistory} />}
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
      <section className="home-hero">
        <HomeArtwork />
        <header className="brand-header">
          <div className="brand-lockup"><span className="brand-mark"><Icon name="trail" /></span><strong>FindTrail</strong></div>
          <span className="local-pill"><Icon name="lock" size={13} />Private on this device</span>
        </header>

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
            <span className="eyebrow">Retrace with a plan</span>
            <h1 id="view-heading" tabIndex={-1} aria-label="A clear path to finding what’s missing.">A clear path to<br /><em>finding what’s missing.</em></h1>
            <p>Choose what’s missing. FindTrail organizes your search and keeps you moving toward the next likely place.</p>
          </div>
        )}
      </section>

      <div className="item-picker">
        <div className="section-heading">
          <div><span>Start here</span><h2>What went missing?</h2></div>
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

function ClueView({ search, settings, question, index, total, onAnswer, onBack }: { search: ActiveSearch; settings: Settings; question: ClueQuestion; index: number; total: number; onAnswer: (value: string) => void; onBack: () => void }) {
  const [selectedValue, setSelectedValue] = useState<string | null>(null)
  const selectionTimer = useRef<number | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const stepLabels = ['About it', 'Last place', 'Last moment']

  useEffect(() => {
    setSelectedValue(null)
    headingRef.current?.focus({ preventScroll: true })
    return () => {
      if (selectionTimer.current !== null) window.clearTimeout(selectionTimer.current)
      selectionTimer.current = null
    }
  }, [question.id])

  function chooseAnswer(value: string) {
    if (selectionTimer.current !== null) return
    setSelectedValue(value)
    if (shouldReduceMotion(settings)) {
      onAnswer(value)
      return
    }
    selectionTimer.current = window.setTimeout(() => {
      selectionTimer.current = null
      onAnswer(value)
    }, 160)
  }

  return (
    <section className="view clue-view" aria-labelledby="view-heading">
      <header className="topbar">
        <button className="icon-button" onClick={onBack} aria-label="Go back"><Icon name="back" /></button>
        <div className="topbar__trail"><span>Building a trail for {search.itemLabel.toLocaleLowerCase()}</span><strong>Clue {index + 1} of {total}</strong></div>
        <span />
      </header>
      <ol className="clue-route" aria-label={`Clue ${index + 1} of ${total}`}>
        {Array.from({ length: total }).map((_, value) => <li key={value} className={value < index ? 'is-complete' : value === index ? 'is-current' : ''}><span>{value < index ? <Icon name="check" size={13} /> : value + 1}</span><small>{stepLabels[value]}</small></li>)}
      </ol>
      <article className="clue-panel">
        <div className="clue-item"><span><Icon name={ITEM_BY_ID[search.itemId].icon} size={21} /></span><div><small>Looking for</small><strong>{search.itemLabel}</strong></div></div>
        <div className="clue-copy">
          <span className="eyebrow">One useful clue</span>
          <h1 ref={headingRef} id="view-heading" tabIndex={-1}>{question.title}</h1>
          <p>{question.helper}</p>
        </div>
        <div className="choice-list">
          {question.options.map((option) => {
            const selected = selectedValue !== null ? selectedValue === option.value : search.answers[question.id] === option.value
            return (
              <button key={option.value} className={selected ? 'choice-button is-selected' : 'choice-button'} onClick={() => chooseAnswer(option.value)}>
                <span><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</span>
                <span className="choice-button__arrow">{selected ? <Icon name="check" size={18} /> : <Icon name="forward" size={18} />}</span>
              </button>
            )
          })}
        </div>
        <p className="reassurance"><Icon name="calm" size={17} /> No perfect remembering required. Pick the closest answer and keep moving.</p>
      </article>
    </section>
  )
}

function FoundView({ search, value, saveAsHome, pinCustomItem, onChange, onSaveAsHome, onPinCustomItem, onSave, onBack }: { search: ActiveSearch; value: string; saveAsHome: boolean; pinCustomItem: boolean; onChange: (value: string) => void; onSaveAsHome: (value: boolean) => void; onPinCustomItem: (value: boolean) => void; onSave: () => void; onBack: () => void }) {
  const stop = search.stops[search.currentIndex]
  const options = getFoundSuggestions(search.itemId, stop).slice(0, 6)
  return (
    <section className="view found-view" aria-labelledby="view-heading">
      <header className="topbar found-topbar">
        <button className="icon-button" onClick={onBack} aria-label="Back to search"><Icon name="back" /></button>
        <div className="topbar__trail"><span>{search.itemLabel}</span><strong>Found it</strong></div>
        <span />
      </header>
      <div className="found-hero">
        <div className="success-mark"><Icon name="spark" size={31} /></div>
        <div><span className="eyebrow">Trail successful</span><h1 id="view-heading" tabIndex={-1}>There it is.</h1><p>Tell FindTrail where it turned up so the next search starts smarter.</p></div>
      </div>
      <section className="found-panel" aria-labelledby="found-location-heading">
        <div className="found-panel__heading"><div><span>One last useful detail</span><h2 id="found-location-heading">Where was it?</h2></div>{value && <span className="found-ready"><Icon name="check" size={15} />Ready to save</span>}</div>
        <div className="location-chips" role="group" aria-label="Where the item was found">
          {options.map((option) => <button key={option} className={value === option ? 'chip is-selected' : 'chip'} onClick={() => onChange(option)}>{option}</button>)}
        </div>
        <label className="field"><span>Or type the exact place</span><input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Example: black hoodie pocket" maxLength={80} /></label>
        <div className="remember-options">
          <SettingToggle label={`Save this as the home spot for ${search.itemLabel}`} detail="FindTrail will check here first next time." checked={saveAsHome} onChange={onSaveAsHome} />
          {search.itemId === 'other' && saveAsHome && <SettingToggle label={`Pin ${search.itemLabel} on Home`} detail="Start this search again with one tap." checked={pinCustomItem} onChange={onPinCustomItem} />}
        </div>
        <button className="button button--primary button--wide" onClick={onSave} disabled={!value.trim()}><Icon name="check" size={19} />Save this found place</button>
      </section>
    </section>
  )
}

function CompleteView({ summary, onHome, onAnother }: { summary: FoundSummary; onHome: () => void; onAnother: () => void }) {
  return (
    <section className="view complete-view" aria-labelledby="view-heading">
      <Scenery compact />
      <span className="eyebrow">Trail complete</span>
      <h1 id="view-heading" tabIndex={-1}>Found and remembered.</h1>
      <p><strong>{summary.itemLabel}</strong> was hiding at <strong>{summary.location}</strong>.</p>
      <div className="complete-stat"><span>Search time</span><strong>{formatDuration(summary.seconds)}</strong><small>Useful data, not a speed contest</small></div>
      <button className="button button--primary button--wide" onClick={onHome}>Back home</button>
      <button className="button button--quiet button--wide" onClick={onAnother}>Find something else</button>
    </section>
  )
}

function HistoryView({ history, initialEntryId, onStart, onClear }: { history: FoundEntry[]; initialEntryId: string | null; onStart: (itemId: ItemId, label?: string) => void; onClear: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(initialEntryId)
  const pattern = useMemo(() => {
    if (!history.length) return null
    const latest = history[0]
    return { item: latest, likely: mostLikelyLocation(history, latest.itemId, latest.itemLabel) }
  }, [history])
  useEffect(() => setExpandedId(initialEntryId), [initialEntryId])
  return (
    <section className="view history-view" aria-labelledby="view-heading">
      <header className="page-heading"><span className="eyebrow">Patterns, not judgment</span><h1 id="view-heading" tabIndex={-1}>Found history</h1><p>Your device remembers the useful part: where things actually turned up.</p></header>
      {pattern?.likely && <article className="pattern-card"><Icon name="spark" /><div><span>Current usual suspect</span><strong>{pattern.item.itemLabel}: {pattern.likely.location}</strong><small>Found there {pattern.likely.count} {pattern.likely.count === 1 ? 'time' : 'times'}</small></div></article>}
      {!history.length ? <div className="empty-state"><Icon name="history" size={34} /><h2>No found places yet</h2><p>Complete one search and the helpful patterns begin here.</p></div> : (
        <div className="history-list">
          {history.map((entry) => {
            const expanded = expandedId === entry.id
            const detailId = `history-detail-${entry.id}`
            return <article key={entry.id} className={expanded ? 'history-entry is-expanded' : 'history-entry'}>
              <button className="history-row" onClick={() => setExpandedId(expanded ? null : entry.id)} aria-expanded={expanded} aria-controls={detailId}>
                <span className="history-row__icon"><Icon name={ITEM_BY_ID[entry.itemId].icon} size={20} /></span>
                <span><strong>{entry.itemLabel}</strong><small>{entry.foundLocation}</small></span>
                <span className="history-row__end"><time dateTime={entry.foundAt}>{dateLabel(entry.foundAt)}</time><Icon name="forward" size={16} /></span>
              </button>
              {expanded && <div id={detailId} className="history-entry__detail">
                <div><span>Found at</span><strong>{entry.foundLocation}</strong></div>
                <div><span>Stops checked</span><strong>{entry.stopsChecked}</strong></div>
                <div><span>Search time</span><strong>{formatDuration(entry.durationSeconds)}</strong></div>
                <button className="button button--secondary" onClick={() => onStart(entry.itemId, entry.itemLabel)}>Find {entry.itemLabel.toLocaleLowerCase()} again</button>
              </div>}
            </article>
          })}
        </div>
      )}
      {history.length > 0 && <button className="text-button danger-link" onClick={onClear}>Clear found history</button>}
    </section>
  )
}

function SettingsView({ data, canInstall, backupStatus, onUpdate, onUpdateSavedItem, onRemoveSavedItem, onInstall, onExport, onRestore, onClear }: { data: PersistedData; canInstall: boolean; backupStatus: string; onUpdate: (next: Partial<Settings>) => void; onUpdateSavedItem: (id: string, next: Partial<Pick<SavedItem, 'homeSpot' | 'pinned'>>) => void; onRemoveSavedItem: (id: string) => void; onInstall: () => void; onExport: () => void; onRestore: (file: File) => void; onClear: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  return (
    <section className="view settings-view" aria-labelledby="view-heading">
      <header className="page-heading"><span className="eyebrow">Make it yours</span><h1 id="view-heading" tabIndex={-1}>Settings</h1><p>Useful controls. No cockpit full of switches.</p></header>
      {canInstall && <button className="install-card" onClick={onInstall}><span><Icon name="download" /></span><div><strong>Install FindTrail</strong><small>Add it to your home screen for quicker access.</small></div><b>Install</b></button>}
      <div className="settings-group">
        <h2>During a search</h2>
        <SettingToggle label="Read new stops aloud" detail="Uses your device’s built-in voice." checked={data.settings.speakSteps} onChange={(value) => onUpdate({ speakSteps: value })} />
        <SettingToggle label="Offer a reset every 3 stops" detail="A pause, not a forced timeout." checked={data.settings.calmPause} onChange={(value) => onUpdate({ calmPause: value })} />
      </div>
      <div className="settings-group">
        <h2>Appearance</h2>
        <label className="select-setting"><span><strong>Motion</strong><small>System follows your phone setting.</small></span><select value={data.settings.motion} onChange={(event) => onUpdate({ motion: event.target.value as Settings['motion'] })}><option value="system">Use system setting</option><option value="full">Full motion</option><option value="reduced">Reduced motion</option></select></label>
        <SettingToggle label="Larger text" detail="Adds breathing room and a little more scrolling." checked={data.settings.textSize === 'large'} onChange={(value) => onUpdate({ textSize: value ? 'large' : 'standard' })} />
      </div>
      <div className="settings-group saved-homes">
        <h2>Saved home spots</h2>
        {!data.savedItems.length && <p className="settings-empty">When you find something, you can save that exact place as its home.</p>}
        {data.savedItems.map((item) => <SavedHomeRow key={item.id} item={item} onUpdate={onUpdateSavedItem} onRemove={onRemoveSavedItem} />)}
      </div>
      <div className="settings-group settings-group--privacy">
        <h2>Your data</h2>
        <p>Everything stays in this browser on this device. No account, analytics, ads, or mystery cloud bucket.</p>
        <div className="data-count"><span>Saved finds</span><strong>{data.history.length}</strong></div>
        <div className="backup-actions">
          <button className="button button--secondary" onClick={onExport}><Icon name="download" size={18} />Export backup</button>
          <button className="button button--secondary" onClick={() => fileInput.current?.click()}><Icon name="upload" size={18} />Restore backup</button>
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" aria-label="Choose FindTrail backup file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onRestore(file); event.target.value = '' }} />
        </div>
        {backupStatus && <p className="backup-status" role="status">{backupStatus}</p>}
        <button className="button button--danger-outline" onClick={onClear} disabled={!data.history.length}>Clear found history</button>
      </div>
      <footer className="version-note">FindTrail 2.6 · A clear path to finding what’s missing.</footer>
    </section>
  )
}

function SettingToggle({ label, detail, checked, onChange }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="toggle-setting"><span><strong>{label}</strong><small>{detail}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i aria-hidden="true" /></label>
}

function SavedHomeRow({ item, onUpdate, onRemove }: { item: SavedItem; onUpdate: (id: string, next: Partial<Pick<SavedItem, 'homeSpot' | 'pinned'>>) => void; onRemove: (id: string) => void }) {
  const [draft, setDraft] = useState(item.homeSpot)
  useEffect(() => setDraft(item.homeSpot), [item.homeSpot])

  function commit() {
    const next = draft.trim()
    if (!next) {
      setDraft(item.homeSpot)
      return
    }
    if (next !== item.homeSpot) onUpdate(item.id, { homeSpot: next })
  }

  return <div className="saved-home-row">
    <span><strong>{item.itemLabel}</strong><small>{item.itemId === 'other' ? 'Custom item' : 'Saved first stop'}</small></span>
    <label><span className="sr-only">Home spot for {item.itemLabel}</span><input value={draft} maxLength={80} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
    {item.itemId === 'other' && <button className={item.pinned ? 'mini-action is-active' : 'mini-action'} onClick={() => onUpdate(item.id, { pinned: !item.pinned })} aria-pressed={item.pinned}><Icon name="pin" size={15} />{item.pinned ? 'Pinned' : 'Pin'}</button>}
    <button className="mini-action mini-action--danger" onClick={() => onRemove(item.id)}>Forget</button>
  </div>
}
