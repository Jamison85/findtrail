import type { ClueQuestion, ItemDefinition, ItemId, SearchStop } from './types'

const LAST_PLACE: ClueQuestion = {
  id: 'lastPlace',
  title: 'Where do you last remember having it?',
  helper: 'A rough answer is enough. We only need a useful starting point.',
  options: [
    { value: 'home', label: 'At home', detail: 'Any room counts' },
    { value: 'car', label: 'In the car', detail: 'Driving or parked' },
    { value: 'work', label: 'At work', detail: 'Or another familiar place' },
    { value: 'out', label: 'Elsewhere', detail: 'Store, appointment, visit' },
    { value: 'unsure', label: 'Not sure', detail: 'We can still build a useful trail' },
  ],
}

const LAST_ACTION: ClueQuestion = {
  id: 'lastAction',
  title: 'What happened around that time?',
  helper: 'Choose the closest scene. We will put its likely places first.',
  options: [
    { value: 'arrived', label: 'Went through a doorway', detail: 'Came in, headed out, unloaded' },
    { value: 'changed', label: 'Changed clothes', detail: 'Pockets, laundry, bedroom' },
    { value: 'sat', label: 'Sat or lay down', detail: 'Couch, chair, bed' },
    { value: 'carried', label: 'Used a bag', detail: 'Work bag, shopping bag, pouch' },
    { value: 'cleaned', label: 'Cleaned or moved things', detail: 'It may have moved with the task' },
    { value: 'unsure', label: 'Not sure', detail: 'We will use the usual route' },
  ],
}

const detailQuestion = (id: ItemId): ClueQuestion => {
  const questions: Record<ItemId, ClueQuestion> = {
    keys: {
      id: 'itemDetail', title: 'Which keys are missing?', helper: 'This changes the first few stops.',
      options: [
        { value: 'car', label: 'Car keys' }, { value: 'house', label: 'House keys' },
        { value: 'work', label: 'Work keys' }, { value: 'ring', label: 'The whole key ring' },
      ],
    },
    wallet: {
      id: 'itemDetail', title: 'How do you usually carry it?', helper: 'Pick what was true most recently.',
      options: [
        { value: 'pocket', label: 'In a pocket' }, { value: 'bag', label: 'In a bag' },
        { value: 'phone', label: 'Attached to my phone' }, { value: 'unsure', label: 'Not sure' },
      ],
    },
    money: {
      id: 'itemDetail', title: 'What went missing?', helper: 'Cards get one extra safety step.',
      options: [
        { value: 'cash', label: 'Cash' }, { value: 'card', label: 'A card' },
        { value: 'both', label: 'Cash and cards' }, { value: 'unsure', label: 'Not sure' },
      ],
    },
    phone: {
      id: 'itemDetail', title: 'Can the phone make sound?', helper: 'We will not waste time ringing a dead battery.',
      options: [
        { value: 'ring', label: 'Yes, it can ring' }, { value: 'silent', label: 'Maybe on silent' },
        { value: 'dead', label: 'Battery may be dead' }, { value: 'unsure', label: 'Not sure' },
      ],
    },
    medicine: {
      id: 'itemDetail', title: 'How time-sensitive is it?', helper: 'If missing a dose could be dangerous, get human help while you search.',
      options: [
        { value: 'urgent', label: 'Urgent or rescue medicine' }, { value: 'today', label: 'Needed today' },
        { value: 'routine', label: 'Routine medicine' }, { value: 'unsure', label: 'Not sure' },
      ],
    },
    glasses: {
      id: 'itemDetail', title: 'Which glasses?', helper: 'Different glasses tend to travel different routes.',
      options: [
        { value: 'regular', label: 'Everyday glasses' }, { value: 'readers', label: 'Readers' },
        { value: 'sun', label: 'Sunglasses' }, { value: 'unsure', label: 'Not sure' },
      ],
    },
    remote: {
      id: 'itemDetail', title: 'Where is the remote normally used?', helper: 'Start with its home territory.',
      options: [
        { value: 'living', label: 'Living room' }, { value: 'bedroom', label: 'Bedroom' },
        { value: 'other', label: 'Another room' }, { value: 'unsure', label: 'Not sure' },
      ],
    },
    other: {
      id: 'itemDetail', title: 'How does this item usually travel?', helper: 'Choose the closest description.',
      options: [
        { value: 'carried', label: 'Carried in a hand' }, { value: 'pocket', label: 'Kept in a pocket' },
        { value: 'bag', label: 'Kept in a bag' }, { value: 'home', label: 'Mostly stays home' },
      ],
    },
  }
  return questions[id]
}

export const ITEMS: ItemDefinition[] = ([
  { id: 'keys', label: 'Keys', shortLabel: 'Keys', hint: 'House, car, or work', icon: 'keys', questions: [], baseStops: ['drop-zone', 'pockets', 'car', 'counters', 'bags', 'seating', 'bathroom', 'laundry'], foundSuggestions: ['Entry table', 'Jacket pocket', 'Car console', 'Kitchen counter', 'Couch'] },
  { id: 'wallet', label: 'Wallet', shortLabel: 'Wallet', hint: 'Wallet or card holder', icon: 'wallet', questions: [], baseStops: ['pockets', 'car', 'drop-zone', 'bags', 'seating', 'bed', 'recent-places', 'laundry'], foundSuggestions: ['Pants pocket', 'Car', 'Entry table', 'Work bag', 'Couch'] },
  { id: 'money', label: 'Cash or card', shortLabel: 'Money', hint: 'Cash, card, or envelope', icon: 'money', questions: [], baseStops: ['pockets', 'wallet', 'papers', 'car', 'bags', 'counters', 'seating', 'laundry'], foundSuggestions: ['Wallet', 'Pocket', 'Envelope', 'Car', 'Receipt pile'] },
  { id: 'phone', label: 'Phone', shortLabel: 'Phone', hint: 'Phone or small device', icon: 'phone', questions: [], baseStops: ['ring-phone', 'chargers', 'seating', 'bed', 'bathroom', 'car', 'counters', 'laundry'], foundSuggestions: ['Charger', 'Couch', 'Bed', 'Bathroom', 'Car'] },
  { id: 'medicine', label: 'Medicine', shortLabel: 'Medicine', hint: 'Bottle, organizer, or packet', icon: 'medicine', questions: [], baseStops: ['medicine-home', 'bags', 'bathroom', 'counters', 'bed', 'car', 'laundry'], foundSuggestions: ['Medicine cabinet', 'Pill organizer', 'Kitchen', 'Bedside', 'Bag'] },
  { id: 'glasses', label: 'Glasses', shortLabel: 'Glasses', hint: 'Everyday, readers, or sun', icon: 'glasses', questions: [], baseStops: ['body', 'bed', 'bathroom', 'counters', 'seating', 'car', 'papers', 'laundry'], foundSuggestions: ['On my head', 'Bedside', 'Bathroom', 'Couch', 'Car'] },
  { id: 'remote', label: 'Remote', shortLabel: 'Remote', hint: 'TV, fan, or device remote', icon: 'remote', questions: [], baseStops: ['seating', 'blankets', 'tables', 'bed', 'counters', 'bathroom', 'under-furniture', 'laundry'], foundSuggestions: ['Couch cushions', 'Blanket', 'Side table', 'Bed', 'Under furniture'] },
  { id: 'other', label: 'Other item', shortLabel: 'Other', hint: 'Name whatever vanished', icon: 'other', questions: [], baseStops: ['pockets', 'usual-home', 'activity-area', 'car', 'seating', 'bags', 'counters', 'slow-sweep'], foundSuggestions: ['Usual spot', 'Pocket', 'Bag', 'Car', 'Counter'] },
] satisfies ItemDefinition[]).map((item) => ({ ...item, questions: [detailQuestion(item.id), LAST_PLACE, LAST_ACTION] }))

export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((item) => [item.id, item])) as Record<ItemId, ItemDefinition>

export const STOPS: Record<string, SearchStop> = {
  'safety-help': { id: 'safety-help', title: 'Get backup while you search', instruction: 'If this medicine is time-critical, contact a pharmacist, clinician, or trusted person now. Keep searching with help.', spots: ['Tell someone nearby', 'Call the pharmacy or care team', 'Check your dose instructions'], reason: 'Safety comes first for urgent medicine.', kind: 'safety' },
  'card-safety': { id: 'card-safety', title: 'Protect the card', instruction: 'Open the card app and temporarily lock or freeze the missing card while you search.', spots: ['Lock or freeze the card', 'Check recent activity', 'Keep the issuer number handy'], reason: 'This limits damage without ending the search.', kind: 'safety' },
  'ring-phone': { id: 'ring-phone', title: 'Make it announce itself', instruction: 'Stop moving for a moment. Call, ping, or use the device-finding service, then listen.', spots: ['Call the phone', 'Use Find My or device finder', 'Listen room by room'], reason: 'Sound is faster than searching.' },
  'attached-phone': { id: 'attached-phone', title: 'Find the phone first', instruction: 'If the wallet is attached to your phone, locate the phone and check its case or wallet attachment before searching other places.', spots: ['Find the phone', 'Check the phone case', 'Check where the attachment could have slipped'], reason: 'You said the wallet travels with your phone.' },
  chargers: { id: 'chargers', title: 'Charging places', instruction: 'Check only places where the phone could be plugged in or set down beside a cable.', spots: ['Bedside charger', 'Couch charger', 'Kitchen charger', 'Car charger'] },
  body: { id: 'body', title: 'The embarrassingly close check', instruction: 'Before walking anywhere, check your body and what you are wearing.', spots: ['On your face or head', 'Hanging from your shirt', 'In your hand', 'Current pockets'] },
  'drop-zone': { id: 'drop-zone', title: 'The landing zone', instruction: 'Check where your hands unloaded when you came through the door.', spots: ['Entry table or hook', 'Beside the door', 'Near shoes', 'First counter inside'] },
  pockets: { id: 'pockets', title: 'Current and previous pockets', instruction: 'Check clothing completely. Patting the outside is a notorious liar.', spots: ['Current pants', 'Previous pants', 'Jacket or hoodie', 'Work clothes', 'Shoes or boots'] },
  wallet: { id: 'wallet', title: 'Inside the wallet', instruction: 'Open each section and move receipts instead of peeking around them.', spots: ['Cash fold', 'Behind cards', 'Zipper section', 'Between receipts'] },
  car: { id: 'car', title: 'The car drop zones', instruction: 'Use a light and check where the item could slide, not just where it should sit.', spots: ['Driver-seat gap', 'Center console', 'Cup holders', 'Door pockets', 'Floorboards'] },
  counters: { id: 'counters', title: 'Flat surfaces', instruction: 'Scan one surface at a time. Lift only what could actually cover the item.', spots: ['Kitchen counter', 'Bathroom counter', 'Bedside table', 'Entry table'] },
  bags: { id: 'bags', title: 'Bags, one pocket at a time', instruction: 'Finish one bag before opening the next. Random rummaging is how bags win.', spots: ['Work bag', 'Backpack or tote', 'Shopping bags', 'Small inner pouches'] },
  seating: { id: 'seating', title: 'Where you sat down', instruction: 'Search the seat, its cracks, and the floor around it before moving on.', spots: ['Couch cushions', 'Favorite chair', 'Between seat and arm', 'Floor underneath'] },
  blankets: { id: 'blankets', title: 'Blankets and soft things', instruction: 'Fold or shake one item at a time so the missing thing does not migrate again.', spots: ['Couch blanket', 'Throw pillows', 'Pet blanket', 'Bed covers'] },
  bed: { id: 'bed', title: 'Bed and bedside', instruction: 'Check the small drop zone around where you sleep or got dressed.', spots: ['Nightstand', 'Under pillow', 'Bed edge', 'Floor beside bed'] },
  bathroom: { id: 'bathroom', title: 'Bathroom pause points', instruction: 'Check the places where an item lands while washing hands, changing, or getting ready.', spots: ['Sink ledge', 'Shelf or cabinet', 'Towel area', 'Laundry pile'] },
  laundry: { id: 'laundry', title: 'Laundry trail', instruction: 'Check pockets before moving clothes. Search the machines only when safe to do so.', spots: ['Hamper', 'Loose clothing', 'Washer', 'Dryer', 'Folding area'] },
  papers: { id: 'papers', title: 'Paper, receipts, and envelopes', instruction: 'Lift small stacks slowly. Thin things disappear inside other thin things.', spots: ['Mail pile', 'Receipts', 'Envelopes', 'Shopping or food bags'] },
  tables: { id: 'tables', title: 'Tables near the usual seat', instruction: 'Check the top, the shelf below, and the narrow gap beside the furniture.', spots: ['Coffee table', 'Side table', 'TV stand', 'Nearby shelf'] },
  'under-furniture': { id: 'under-furniture', title: 'Under nearby furniture', instruction: 'Use a flashlight. Look before reaching, especially around cords or moving parts.', spots: ['Under couch', 'Under chair', 'Under bed', 'Along wall edges'] },
  'medicine-home': { id: 'medicine-home', title: 'The medicine home', instruction: 'Check the normal container and the surface immediately around it.', spots: ['Medicine cabinet', 'Pill organizer area', 'Kitchen medicine spot', 'Bedside medicine spot'] },
  'usual-home': { id: 'usual-home', title: 'Its normal home', instruction: 'Check the proper spot and a three-foot circle around it.', spots: ['Normal shelf or drawer', 'Surface above or below', 'Floor nearby', 'Container beside it'] },
  'activity-area': { id: 'activity-area', title: 'Where you use it', instruction: 'Go to the last activity that required this item. Search only that small area.', spots: ['Work surface', 'Chair or desk', 'Nearby container', 'Floor below'] },
  work: { id: 'work', title: 'Work or familiar-place trail', instruction: 'Check the last station you used, then ask the person nearest that area.', spots: ['Workstation', 'Break area', 'Locker or storage', 'Lost and found'] },
  'recent-places': { id: 'recent-places', title: 'The last place you visited', instruction: 'Check bags and receipts for a clue, then make one practical call if needed.', spots: ['Most recent store or stop', 'Checkout or seating area', 'Lost and found', 'Receipt timestamp'] },
  'cleaning-trail': { id: 'cleaning-trail', title: 'The cleaning side quest', instruction: 'Think like the object was “put somewhere safe” mid-clean. Check the containers you carried.', spots: ['Cleaning caddy', 'Temporary pile', 'Trash top layer', 'Room you moved items into'] },
  'slow-sweep': { id: 'slow-sweep', title: 'Slow final sweep', instruction: 'Do not expand the search. Repeat the likeliest three zones slowly or ask for a second set of eyes.', spots: ['Most likely earlier stop', 'Three-foot circles', 'Top layer of trash', 'Ask another person'], kind: 'final' },
}

export const CLUE_PROMOTIONS: Record<string, Record<string, string[]>> = {
  lastPlace: {
    home: ['drop-zone', 'counters', 'seating'], car: ['car', 'pockets', 'bags'],
    work: ['work', 'pockets', 'bags'], out: ['recent-places', 'car', 'bags'], unsure: [],
  },
  lastAction: {
    arrived: ['drop-zone', 'pockets', 'car'], changed: ['pockets', 'laundry', 'bed'],
    sat: ['seating', 'blankets', 'bed'], carried: ['bags', 'pockets', 'car'],
    cleaned: ['cleaning-trail', 'counters', 'laundry'], unsure: [],
  },
  itemDetail: {
    pocket: ['pockets'], bag: ['bags'], car: ['car'], work: ['work'],
    phone: ['attached-phone'], ring: ['ring-phone'], silent: ['seating', 'bed'], dead: ['chargers'],
    living: ['seating', 'blankets', 'tables'], bedroom: ['bed', 'blankets'],
    sun: ['car', 'bags'], readers: ['tables', 'papers'], carried: ['activity-area', 'counters'],
    home: ['usual-home'], cash: ['pockets', 'wallet', 'papers'], card: ['wallet', 'pockets'], both: ['wallet', 'pockets'],
  },
}
