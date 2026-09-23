import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { PersistedData, SavedItem, Settings } from '../types'
import { Icon } from './Icon'

interface SettingsViewProps {
  data: PersistedData
  canInstall: boolean
  iosInstallHelpAvailable: boolean
  backupStatus: { message: string; kind: 'success' | 'error' } | null
  onUpdate: (next: Partial<Settings>) => void
  onUpdateSavedItem: (id: string, next: Partial<Pick<SavedItem, 'homeSpot' | 'pinned'>>) => void
  onRemoveSavedItem: (id: string) => void
  onInstall: () => void
  onShowIOSInstallHelp: () => void
  onExport: () => void
  onRestore: (file: File) => void
  onClear: () => void
}

interface SettingsSectionProps {
  icon: 'trail' | 'settings' | 'home' | 'lock'
  title: string
  detail: string
  children: ReactNode
  className?: string
}

function SettingsSection({ icon, title, detail, children, className = '' }: SettingsSectionProps) {
  return (
    <section className={`settings-section ${className}`.trim()}>
      <header>
        <span aria-hidden="true"><Icon name={icon} size={19} /></span>
        <div><h2>{title}</h2><p>{detail}</p></div>
      </header>
      <div className="settings-section__body">{children}</div>
    </section>
  )
}

export function SettingsView({ data, canInstall, iosInstallHelpAvailable, backupStatus, onUpdate, onUpdateSavedItem, onRemoveSavedItem, onInstall, onShowIOSInstallHelp, onExport, onRestore, onClear }: SettingsViewProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const findLabel = `${data.history.length} saved ${data.history.length === 1 ? 'find' : 'finds'}`
  const homeLabel = `${data.savedItems.length} saved ${data.savedItems.length === 1 ? 'home' : 'homes'}`

  return (
    <section className="view settings-view" aria-labelledby="view-heading">
      <header className="settings-header">
        <span className="settings-header__mark" aria-hidden="true"><Icon name="settings" size={25} /></span>
        <div><h1 id="view-heading" tabIndex={-1}>Settings</h1><p>Keep FindTrail calm, useful, and yours.</p></div>
      </header>

      <div className="device-privacy" role="note">
        <span aria-hidden="true"><Icon name="lock" size={19} /></span>
        <p><strong>Private on this device</strong><small>{findLabel} · {homeLabel} · no account or tracking</small></p>
      </div>

      {canInstall ? (
        <button className="install-card" onClick={onInstall}>
          <span><Icon name="download" /></span>
          <div><strong>Install FindTrail</strong><small>Open it from your home screen, even offline.</small></div>
          <b>Install</b>
        </button>
      ) : iosInstallHelpAvailable ? (
        <button className="install-card" onClick={onShowIOSInstallHelp}>
          <span><Icon name="download" /></span>
          <div><strong>Add FindTrail to Home Screen</strong><small>See the iPhone steps again anytime.</small></div>
          <b>How</b>
        </button>
      ) : null}

      <SettingsSection icon="trail" title="During a search" detail="Guidance while you move through a trail.">
        <SettingToggle label="Read new stops aloud" detail="Uses FindTrail’s local voice. The first use downloads its voice model." checked={data.settings.speakSteps} onChange={(value) => onUpdate({ speakSteps: value })} />
        <SettingToggle label="Offer a reset every 3 stops" detail="A gentle pause when the search starts getting noisy." checked={data.settings.calmPause} onChange={(value) => onUpdate({ calmPause: value })} />
      </SettingsSection>

      <SettingsSection icon="settings" title="Appearance" detail="Choose the amount of motion and breathing room.">
        <label className="select-setting">
          <span><strong>Motion</strong><small>System follows your phone’s accessibility setting.</small></span>
          <select aria-label="Motion" value={data.settings.motion} onChange={(event) => onUpdate({ motion: event.target.value as Settings['motion'] })}>
            <option value="system">Use system</option>
            <option value="full">Full motion</option>
            <option value="reduced">Reduced motion</option>
          </select>
        </label>
        <SettingToggle label="Larger text" detail="Increases type size and allows comfortable scrolling." checked={data.settings.textSize === 'large'} onChange={(value) => onUpdate({ textSize: value ? 'large' : 'standard' })} />
      </SettingsSection>

      <SettingsSection icon="home" title="Saved home spots" detail="The intentional places FindTrail checks first." className="saved-homes">
        {!data.savedItems.length ? (
          <div className="settings-empty"><Icon name="home" size={22} /><p><strong>No saved homes yet.</strong><small>Save one after finding an item and it will appear here.</small></p></div>
        ) : data.savedItems.map((item) => <SavedHomeRow key={item.id} item={item} onUpdate={onUpdateSavedItem} onRemove={onRemoveSavedItem} />)}
      </SettingsSection>

      <SettingsSection icon="lock" title="Your data" detail="Back up, restore, or clear what this device remembers." className="settings-section--data">
        <div className="data-summary">
          <div><span>Found history</span><strong>{data.history.length}</strong></div>
          <div><span>Saved homes</span><strong>{data.savedItems.length}</strong></div>
        </div>
        <p className="privacy-copy">Your search history, clues, and saved places stay in this browser. Read aloud generates speech on your device after its free voice model is downloaded.</p>
        <div className="backup-actions">
          <button className="button button--secondary" onClick={onExport}><Icon name="download" size={18} />Export backup</button>
          <button className="button button--secondary" onClick={() => fileInput.current?.click()}><Icon name="upload" size={18} />Restore backup</button>
          <input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" aria-label="Choose FindTrail backup file" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onRestore(file); event.target.value = '' }} />
        </div>
        {backupStatus && (
          <p className={`backup-status is-${backupStatus.kind}`} role={backupStatus.kind === 'error' ? 'alert' : 'status'}>
            <Icon name={backupStatus.kind === 'error' ? 'close' : 'check'} size={16} />{backupStatus.message}
          </p>
        )}
        <div className="danger-zone">
          <span><strong>Clear found history</strong><small>Saved home spots will stay.</small></span>
          <button className="button button--danger-outline" onClick={onClear} disabled={!data.history.length}>Clear history</button>
        </div>
      </SettingsSection>

      <footer className="version-note">FindTrail 2.12 · A clear path to finding what’s missing.</footer>
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

  return (
    <article className="saved-home-row">
      <span className="saved-home-row__icon" aria-hidden="true"><Icon name={item.itemId} size={18} /></span>
      <div className="saved-home-row__heading"><strong>{item.itemLabel}</strong><small>{item.itemId === 'other' ? 'Custom item' : 'Checked before learned guesses'}</small></div>
      {item.itemId === 'other' && <button className={item.pinned ? 'mini-action is-active' : 'mini-action'} onClick={() => onUpdate(item.id, { pinned: !item.pinned })} aria-pressed={item.pinned}><Icon name="pin" size={15} />{item.pinned ? 'Pinned' : 'Pin'}</button>}
      <label><span>Home spot</span><input aria-label={`Home spot for ${item.itemLabel}`} value={draft} maxLength={80} onChange={(event) => setDraft(event.target.value)} onBlur={commit} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} /></label>
      <button className="mini-action mini-action--danger" onClick={() => onRemove(item.id)}>Forget home</button>
    </article>
  )
}
