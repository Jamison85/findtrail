import type { ActiveSearch, FoundEntry, ItemId, PersistedData, SavedItem, SearchStop, Settings } from './types'

export const STORAGE_KEY = 'findtrail:data:v3'
export const LEGACY_STORAGE_KEY = 'findtrail:data:v2'
export const BACKUP_FORMAT = 'findtrail-backup'

export const DEFAULT_SETTINGS: Settings = {
  motion: 'system',
  textSize: 'standard',
  speakSteps: false,
  calmPause: true,
}

export const EMPTY_DATA: PersistedData = {
  version: 3,
  history: [],
  activeSearch: null,
  settings: DEFAULT_SETTINGS,
  savedItems: [],
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const ITEM_IDS = new Set<ItemId>(['keys', 'wallet', 'money', 'phone', 'medicine', 'glasses', 'remote', 'other'])

function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && ITEM_IDS.has(value as ItemId)
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return isObject(value) && Object.values(value).every((entry) => typeof entry === 'string')
}

function isStringArrayRecord(value: unknown): value is Record<string, string[]> {
  return isObject(value) && Object.values(value).every(
    (entry) => Array.isArray(entry) && entry.every((item) => typeof item === 'string'),
  )
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isDateString(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function validStop(value: unknown): value is SearchStop {
  if (!isObject(value) || typeof value.id !== 'string' || typeof value.title !== 'string' || typeof value.instruction !== 'string') return false
  return Array.isArray(value.spots) && value.spots.every((spot) => typeof spot === 'string')
}

function validHistory(value: unknown): FoundEntry[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is FoundEntry => {
    if (!isObject(entry)) return false
    return typeof entry.id === 'string'
      && isItemId(entry.itemId)
      && typeof entry.itemLabel === 'string'
      && typeof entry.foundLocation === 'string'
      && isDateString(entry.foundAt)
      && isStringRecord(entry.answers)
      && Number.isInteger(entry.stopsChecked)
      && isFiniteNonNegative(entry.stopsChecked)
      && isFiniteNonNegative(entry.durationSeconds)
      && (entry.foundStopId === undefined || typeof entry.foundStopId === 'string')
      && (entry.foundSpot === undefined || typeof entry.foundSpot === 'string')
  }).slice(0, 100)
}

function validActiveSearch(value: unknown): ActiveSearch | null {
  if (!isObject(value) || ![2, 3].includes(Number(value.version)) || !Array.isArray(value.stops) || !value.stops.every(validStop)) return null
  if (typeof value.id !== 'string' || !isItemId(value.itemId) || typeof value.itemLabel !== 'string' || !isStringRecord(value.answers)) return null
  if (!Number.isInteger(value.currentIndex) || !isFiniteNonNegative(value.currentIndex) || value.currentIndex >= Math.max(1, value.stops.length)) return null
  if (!isStringArrayRecord(value.checkedSpots) || !isDateString(value.startedAt) || !isDateString(value.lastUpdatedAt)) return null
  if (value.skippedStops !== undefined && (!Array.isArray(value.skippedStops) || !value.skippedStops.every((stop) => typeof stop === 'string'))) return null
  if (value.widenReady !== undefined && typeof value.widenReady !== 'boolean') return null
  return { ...(value as unknown as ActiveSearch), version: 3, skippedStops: (value.skippedStops as string[] | undefined) ?? [] }
}

function validSavedItems(value: unknown): SavedItem[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  return value.filter((entry): entry is SavedItem => {
    if (!isObject(entry)
      || typeof entry.id !== 'string'
      || !isItemId(entry.itemId)
      || typeof entry.itemLabel !== 'string'
      || typeof entry.homeSpot !== 'string'
      || typeof entry.pinned !== 'boolean'
      || !isDateString(entry.createdAt)
      || !isDateString(entry.updatedAt)) return false
    if (!entry.itemLabel.trim() || !entry.homeSpot.trim() || seen.has(entry.id)) return false
    seen.add(entry.id)
    return true
  }).slice(0, 50)
}

function validSettings(value: unknown): Settings {
  if (!isObject(value)) return { ...DEFAULT_SETTINGS }
  return {
    motion: ['system', 'full', 'reduced'].includes(String(value.motion)) ? value.motion as Settings['motion'] : DEFAULT_SETTINGS.motion,
    textSize: ['standard', 'large'].includes(String(value.textSize)) ? value.textSize as Settings['textSize'] : DEFAULT_SETTINGS.textSize,
    speakSteps: typeof value.speakSteps === 'boolean' ? value.speakSteps : DEFAULT_SETTINGS.speakSteps,
    calmPause: typeof value.calmPause === 'boolean' ? value.calmPause : DEFAULT_SETTINGS.calmPause,
  }
}

function isCompleteSettings(value: unknown): boolean {
  return isObject(value)
    && ['system', 'full', 'reduced'].includes(String(value.motion))
    && ['standard', 'large'].includes(String(value.textSize))
    && typeof value.speakSteps === 'boolean'
    && typeof value.calmPause === 'boolean'
}

function freshData(): PersistedData {
  return { ...EMPTY_DATA, settings: { ...DEFAULT_SETTINGS }, savedItems: [] }
}

function parsePersisted(parsed: unknown): PersistedData | null {
  if (!isObject(parsed) || ![2, 3].includes(Number(parsed.version))) return null
  return {
    version: 3,
    history: validHistory(parsed.history),
    activeSearch: validActiveSearch(parsed.activeSearch),
    settings: validSettings(parsed.settings),
    savedItems: parsed.version === 3 ? validSavedItems(parsed.savedItems) : [],
  }
}

export function loadData(storage: Pick<Storage, 'getItem'> = localStorage): PersistedData {
  try {
    const raw = storage.getItem(STORAGE_KEY) ?? storage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return freshData()
    return parsePersisted(JSON.parse(raw)) ?? freshData()
  } catch {
    return freshData()
  }
}

export function saveData(data: PersistedData, storage: Pick<Storage, 'setItem'> = localStorage): boolean {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: 3, history: data.history.slice(0, 100), savedItems: data.savedItems.slice(0, 50) }))
    return true
  } catch {
    return false
  }
}

export function createActiveSearch(itemId: ActiveSearch['itemId'], itemLabel: string): ActiveSearch {
  const now = new Date().toISOString()
  return {
    version: 3,
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    itemId,
    itemLabel,
    answers: {},
    stops: [],
    widenReady: false,
    currentIndex: 0,
    checkedSpots: {},
    skippedStops: [],
    startedAt: now,
    lastUpdatedAt: now,
  }
}

export function itemIdentity(itemId: ItemId, itemLabel: string): string {
  return itemId === 'other'
    ? `other:${itemLabel.trim().toLocaleLowerCase().replace(/\s+/g, ' ')}`
    : `item:${itemId}`
}

export function serializeBackup(data: PersistedData): string {
  return JSON.stringify({
    format: BACKUP_FORMAT,
    version: 3,
    exportedAt: new Date().toISOString(),
    data: { ...data, version: 3, history: data.history.slice(0, 100), savedItems: data.savedItems.slice(0, 50) },
  }, null, 2)
}

export function parseBackup(raw: string): { ok: true; data: PersistedData } | { ok: false; error: string } {
  try {
    if (raw.length > 1_000_000) return { ok: false, error: 'That file is too large to be a FindTrail backup.' }
    const parsed: unknown = JSON.parse(raw)
    if (!isObject(parsed) || parsed.format !== BACKUP_FORMAT || parsed.version !== 3 || !isObject(parsed.data)) {
      return { ok: false, error: 'That is not a FindTrail backup file.' }
    }
    if (parsed.data.version !== 3
      || !Array.isArray(parsed.data.history)
      || !Array.isArray(parsed.data.savedItems)
      || !isCompleteSettings(parsed.data.settings)
      || validHistory(parsed.data.history).length !== parsed.data.history.length
      || validSavedItems(parsed.data.savedItems).length !== parsed.data.savedItems.length
      || (parsed.data.activeSearch !== null && !validActiveSearch(parsed.data.activeSearch))) {
      return { ok: false, error: 'The backup is damaged or uses an unsupported version.' }
    }
    const data = parsePersisted(parsed.data)
    if (!data) return { ok: false, error: 'The backup is damaged or uses an unsupported version.' }
    return { ok: true, data }
  } catch {
    return { ok: false, error: 'The backup file could not be read.' }
  }
}
