import type { ActiveSearch, RecoveryAction } from './types'

const SHARED_FINAL_ACTION: RecoveryAction = {
  title: 'Borrow fresh eyes',
  detail: 'Tell someone exactly what is missing and the last certain moment you had it. Let them look without leading them.',
}

export function getRecoveryActions(search: ActiveSearch): RecoveryAction[] {
  if (search.itemId === 'money' && search.answers.itemDetail === 'cash') {
    return [
      { title: 'Trace the cash handoff', detail: 'Think back to the last purchase, withdrawal, envelope, or person who handled the cash. Check that exact place first.' },
      { title: 'Check the last outside stop', detail: 'Use a receipt or your route to identify the last place you handled the cash, then ask its lost and found.' },
      SHARED_FINAL_ACTION,
    ]
  }
  if (search.itemId === 'phone' && search.answers.itemDetail === 'dead') {
    return [
      { title: 'Check the last known location', detail: 'Use the phone maker’s find service from another device. Look for its last location and the time it was recorded; a dead battery may prevent a live location or sound.' },
      { title: 'Follow the last charging route', detail: 'Check the cable, outlet, bag, or car where you last charged it. Contact the last outside stop if the recorded location points there.' },
      SHARED_FINAL_ACTION,
    ]
  }
  if (search.itemId === 'keys' && ['house', 'work'].includes(search.answers.itemDetail)) {
    return [
      { title: 'Use the backup route', detail: search.answers.itemDetail === 'house'
        ? 'Contact the person holding a spare house key, your building manager, or a locksmith if you need access now.'
        : 'Contact your workplace’s key holder, reception, or facilities team for temporary access and missing-key guidance.' },
      { title: 'Call the last place', detail: 'Ask the last business or home you visited to check where you put the keys down.' },
      SHARED_FINAL_ACTION,
    ]
  }
  const actions: Record<ActiveSearch['itemId'], RecoveryAction[]> = {
    keys: [
      { title: 'Use the backup route', detail: 'Get the spare key, call the person holding a copy, or arrange roadside help before another search loop.' },
      { title: 'Call the last place', detail: 'Ask the last business or home you visited to check its counter, seat, and parking area.' },
      SHARED_FINAL_ACTION,
    ],
    wallet: [
      { title: 'Protect the contents', detail: 'Temporarily lock payment cards and review the latest activity before retracing the route.' },
      { title: 'Trace the last transaction', detail: 'Check the receipt or banking time, then call the exact place where you last paid.' },
      SHARED_FINAL_ACTION,
    ],
    money: [
      { title: search.answers.itemDetail === 'unsure' ? 'Check whether a card is missing' : 'Freeze missing cards', detail: search.answers.itemDetail === 'unsure'
        ? 'If a payment card may be missing, temporarily lock it in the issuer app and check recent activity while you confirm what is gone.'
        : 'Use the issuer app or an official issuer contact number. A temporary lock is reversible.' },
      { title: 'Trace the handoff', detail: 'Start with the last purchase, envelope, deposit, or person who handled the money.' },
      SHARED_FINAL_ACTION,
    ],
    phone: [
      { title: 'Use device finding', detail: 'From another device, use the phone maker’s find service to play a sound, view its last location, or mark it lost.' },
      { title: 'Call the route', detail: 'Contact the last place you visited and ask them to check the exact seat, counter, or parking area.' },
      SHARED_FINAL_ACTION,
    ],
    medicine: [
      { title: 'Handle the dose first', detail: search.answers.itemDetail === 'urgent' ? 'Contact emergency services, your care team, pharmacy, or a trusted person now. Do not wait on another search.' : 'Call the pharmacy or care team for safe replacement or missed-dose guidance before guessing.' },
      { title: 'Check the travel chain', detail: 'Ask anyone who helped pack, clean, drive, or manage the medicine to retrace their part.' },
      SHARED_FINAL_ACTION,
    ],
    glasses: [
      { title: 'Switch to a safe backup', detail: 'Use a spare pair or ask someone else to drive. Do not keep searching if poor vision makes the situation unsafe.' },
      { title: 'Ask for a visual sweep', detail: 'Have someone scan fabric, counters, and the car from a different height and angle.' },
      SHARED_FINAL_ACTION,
    ],
    remote: [
      { title: 'Use the temporary controls', detail: 'Try the television or device buttons, or its official remote app, while the remote stays missing.' },
      { title: 'Reset the room', detail: 'Remove blankets and cushions one at a time, then check the furniture frame and floor before putting them back.' },
      SHARED_FINAL_ACTION,
    ],
    other: [
      { title: 'Return to the last certain moment', detail: `Describe what happened immediately before and after you last had ${search.itemLabel.toLocaleLowerCase()}. Check only that small route.` },
      { title: 'Call the outside stops', detail: 'Contact the last place or person on the route instead of assuming the item made it home.' },
      SHARED_FINAL_ACTION,
    ],
  }
  return actions[search.itemId]
}
