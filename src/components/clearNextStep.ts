import { checkedSpotsAt } from '../searchProgress'
import type { ActiveSearch, Screen } from '../types'

export interface ClearNextStep {
  kind: 'place' | 'safety' | 'continue' | 'new'
  label: string
  title: string
  instruction: string
  itemLabel?: string
  spot?: string
  buttonLabel: string
}

function continuation(title: string, search: ActiveSearch): ClearNextStep {
  return {
    kind: 'continue',
    label: 'YOUR SEARCH IS SAVED',
    title,
    instruction: 'Pick up exactly where you left off. Nothing you checked has been lost.',
    itemLabel: search.itemLabel,
    buttonLabel: 'Continue my search',
  }
}

// Read-only projection of the existing trail. Never rerank, skip, mutate or
// guess at a stop here: the real search engine remains the source of truth.
export function clearNextStep(search: ActiveSearch | null, origin: Screen): ClearNextStep {
  if (!search) return {
    kind: 'new',
    label: 'READY WHEN YOU ARE',
    title: 'One thing to find.',
    instruction: 'Choose the missing item. FindTrail will build your trail from there.',
    buttonLabel: 'Begin a search',
  }

  if (search.foundDraft) return continuation('Your note is saved.', search)
  if (origin === 'clues') return continuation('Your clues are still here.', search)
  if (origin === 'widen') return continuation('Your next moves are ready.', search)
  if (origin === 'end') return continuation('Your options are still here.', search)
  if (origin !== 'trail' || search.widenReady || search.reviewingSkippedFrom) {
    return continuation('Your trail is still here.', search)
  }

  const stop = search.stops[search.currentIndex]
  if (!stop || stop.kind === 'final' || search.excludedStopIds?.includes(stop.id)
    || search.skippedStops?.includes(stop.id)) {
    return continuation('Your next move is ready.', search)
  }

  const already = checkedSpotsAt(search, stop)
  const spot = stop.spots.find((candidate) => !already.includes(candidate))
  if (!spot) return continuation('Your next move is ready.', search)
  const safety = stop.kind === 'safety'
  return {
    kind: safety ? 'safety' : 'place',
    label: safety ? 'SAFETY FIRST' : 'NEXT IN YOUR TRAIL',
    title: stop.title,
    instruction: stop.instruction,
    itemLabel: search.itemLabel,
    spot,
    buttonLabel: safety ? 'Continue safely' : 'Return to this place',
  }
}
