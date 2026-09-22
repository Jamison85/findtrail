export type ItemId = 'keys' | 'wallet' | 'money' | 'phone' | 'medicine' | 'glasses' | 'remote' | 'other'

export type Screen = 'home' | 'clues' | 'trail' | 'widen' | 'found' | 'complete' | 'history' | 'calm' | 'settings' | 'end'

export type IconName =
  | 'trail'
  | 'keys'
  | 'wallet'
  | 'money'
  | 'phone'
  | 'medicine'
  | 'glasses'
  | 'remote'
  | 'other'
  | 'home'
  | 'history'
  | 'calm'
  | 'settings'
  | 'back'
  | 'check'
  | 'voice'
  | 'volume'
  | 'pause'
  | 'spark'
  | 'close'
  | 'download'
  | 'upload'
  | 'pin'
  | 'refresh'
  | 'forward'
  | 'lock'

export interface ClueOption {
  value: string
  label: string
  detail?: string
}

export interface ClueQuestion {
  id: string
  title: string
  helper: string
  options: ClueOption[]
}

export interface ItemDefinition {
  id: ItemId
  label: string
  shortLabel: string
  hint: string
  icon: IconName
  questions: ClueQuestion[]
  baseStops: string[]
  foundSuggestions: string[]
}

export interface SearchStop {
  id: string
  title: string
  instruction: string
  spots: string[]
  reason?: string
  kind?: 'standard' | 'history' | 'home' | 'learned' | 'safety' | 'final'
}

export interface FoundEntry {
  id: string
  itemId: ItemId
  itemLabel: string
  foundLocation: string
  foundAt: string
  answers: Record<string, string>
  stopsChecked: number
  durationSeconds: number
  foundStopId?: string
  foundSpot?: string
}

export interface SavedItem {
  id: string
  itemId: ItemId
  itemLabel: string
  homeSpot: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

export interface ActiveSearch {
  version: 3
  id: string
  itemId: ItemId
  itemLabel: string
  answers: Record<string, string>
  stops: SearchStop[]
  currentIndex: number
  checkedSpots: Record<string, string[]>
  startedAt: string
  lastUpdatedAt: string
}

export interface Settings {
  motion: 'system' | 'full' | 'reduced'
  textSize: 'standard' | 'large'
  speakSteps: boolean
  calmPause: boolean
}

export interface PersistedData {
  version: 3
  history: FoundEntry[]
  activeSearch: ActiveSearch | null
  settings: Settings
  savedItems: SavedItem[]
}

export interface RecoveryAction {
  title: string
  detail: string
}
