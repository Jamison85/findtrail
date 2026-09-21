import { useEffect, useMemo, useState } from 'react'
import { ITEM_BY_ID } from '../data'
import { mostLikelyLocation } from '../trailEngine'
import { itemIdentity } from '../storage'
import type { FoundEntry, ItemId } from '../types'
import { Icon } from './Icon'

interface HistoryViewProps {
  history: FoundEntry[]
  initialEntryId: string | null
  onStart: (itemId: ItemId, label?: string) => void
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  const minutes = Math.round(seconds / 60)
  return `${minutes} min`
}

function dateLabel(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Recently'
  const today = new Date()
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const daysAgo = Math.round((startToday - startDate) / 86_400_000)
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date)
}

export function HistoryView({ history, initialEntryId, onStart }: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(initialEntryId)
  const patterns = useMemo(() => {
    const latestByItem = new Map<string, FoundEntry>()
    history.forEach((entry) => {
      const key = itemIdentity(entry.itemId, entry.itemLabel)
      if (!latestByItem.has(key)) latestByItem.set(key, entry)
    })
    return [...latestByItem.values()].map((entry) => ({
      entry,
      likely: mostLikelyLocation(history, entry.itemId, entry.itemLabel),
    })).filter((pattern) => pattern.likely).slice(0, 3)
  }, [history])
  const itemCount = useMemo(() => new Set(history.map((entry) => itemIdentity(entry.itemId, entry.itemLabel))).size, [history])

  useEffect(() => setExpandedId(initialEntryId), [initialEntryId])

  return (
    <section className="view history-view" aria-labelledby="view-heading">
      <header className="memory-header">
        <span className="memory-header__mark" aria-hidden="true"><Icon name="history" size={25} /></span>
        <div>
          <h1 id="view-heading" tabIndex={-1}>What FindTrail remembers</h1>
          <p>Useful patterns from the places your missing things actually turned up.</p>
        </div>
        {history.length > 0 && (
          <dl className="memory-tally" aria-label={`${history.length} saved ${history.length === 1 ? 'find' : 'finds'} across ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}>
            <div><dt>Saved finds</dt><dd>{history.length}</dd></div>
            <div><dt>Items learned</dt><dd>{itemCount}</dd></div>
          </dl>
        )}
      </header>

      {!history.length ? (
        <div className="history-empty">
          <span aria-hidden="true"><Icon name="trail" size={31} /></span>
          <h2>No found places yet</h2>
          <p>Complete one search and FindTrail will remember where the item turned up—without sending that information anywhere.</p>
          <small>Your first useful pattern will appear here.</small>
        </div>
      ) : (
        <>
          <section className="history-patterns" aria-labelledby="patterns-heading">
            <header className="history-section-heading">
              <div><h2 id="patterns-heading">Places worth remembering</h2><p>These locations can move earlier in your next trail.</p></div>
              <span><Icon name="spark" size={15} /> Learned locally</span>
            </header>
            <div className="pattern-list">
              {patterns.map(({ entry, likely }) => likely && (
                <button
                  key={itemIdentity(entry.itemId, entry.itemLabel)}
                  className="memory-pattern"
                  onClick={() => onStart(entry.itemId, entry.itemLabel)}
                  aria-label={`Find ${entry.itemLabel} again. Most likely place: ${likely.location}`}
                >
                  <span className="memory-pattern__icon"><Icon name={ITEM_BY_ID[entry.itemId].icon} size={21} /></span>
                  <span className="memory-pattern__copy">
                    <small>{entry.itemLabel}</small>
                    <strong>{likely.location}</strong>
                    <span>Found here {likely.count} {likely.count === 1 ? 'time' : 'times'}</span>
                  </span>
                  <span className="memory-pattern__action">Find again <Icon name="forward" size={16} /></span>
                </button>
              ))}
            </div>
          </section>

          <section className="recent-finds" aria-labelledby="recent-finds-heading">
            <header className="history-section-heading">
              <div><h2 id="recent-finds-heading">Recent finds</h2><p>Open one to see the useful details.</p></div>
            </header>
            <div className="history-list">
              {history.map((entry) => {
                const expanded = expandedId === entry.id
                const detailId = `history-detail-${entry.id}`
                return (
                  <article key={entry.id} className={expanded ? 'history-entry is-expanded' : 'history-entry'}>
                    <button className="history-row" onClick={() => setExpandedId(expanded ? null : entry.id)} aria-expanded={expanded} aria-controls={detailId} aria-label={`Open ${entry.itemLabel}, found at ${entry.foundLocation}, ${dateLabel(entry.foundAt)}`}>
                      <span className="history-row__icon"><Icon name={ITEM_BY_ID[entry.itemId].icon} size={20} /></span>
                      <span className="history-row__copy"><strong>{entry.itemLabel}</strong><small>{entry.foundLocation}</small></span>
                      <span className="history-row__end"><time dateTime={entry.foundAt}>{dateLabel(entry.foundAt)}</time><Icon name="forward" size={16} /></span>
                    </button>
                    {expanded && (
                      <div id={detailId} className="history-entry__detail">
                        <div className="history-entry__location"><span>Exact place</span><strong>{entry.foundLocation}</strong></div>
                        <dl>
                          <div><dt>Places checked</dt><dd>{entry.stopsChecked}</dd></div>
                          <div><dt>Search time</dt><dd>{formatDuration(entry.durationSeconds)}</dd></div>
                          <div><dt>Found</dt><dd>{dateLabel(entry.foundAt)}</dd></div>
                        </dl>
                        <button className="button button--secondary" onClick={() => onStart(entry.itemId, entry.itemLabel)}>
                          <Icon name="trail" size={17} />Find {entry.itemLabel.toLocaleLowerCase()} again
                        </button>
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          </section>
        </>
      )}
    </section>
  )
}
