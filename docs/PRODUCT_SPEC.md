# FindTrail product specification

## Job to be done

When an item goes missing and attention starts scattering, FindTrail should hold the search plan so the user only has to check the next sensible place.

## Primary flow

1. Choose the missing item, or name a custom item.
2. Answer at most three short clue questions.
3. Follow one ranked search stop at a time.
4. Mark the exact place where the item was found.
5. Use that history to improve later search order.
6. Optionally make the found place the item’s intentional home.

An interrupted search must survive a refresh or app restart.

## Release features

- Eight common item categories plus custom items
- Context-aware trail ranking using location, recent activity, item type, and found history
- One-stop-at-a-time search with optional sub-place checkmarks
- Active-search recovery
- Local found-item history, saved home spots, pinned custom items, and simple pattern summaries
- Future trail ranking learned from both exact locations and successful search areas
- Item-specific next actions after an unsuccessful first trail
- Validated local JSON backup and restore
- User-controlled installed-app update notices
- 36-second guided breathing reset with one feather landing and one water impact
- Optional local spoken instructions and browser-supported single voice commands with microphone disclosure
- Reduced motion and larger text settings
- Offline PWA shell with install metadata
- Destructive-data confirmation, original-data recovery, and simultaneous-tab conflict protection

## Explicit non-goals

- Accounts, cloud sync, social features, ads, or analytics
- Pretending deterministic ranking is artificial intelligence
- Whole-home organization, inventory, or chore management
- Medical diagnosis or emergency decision-making
- A mascot, game economy, points, streaks, or guilt loops

## Voice and tone

FindTrail is steady, capable, and lightly funny. It says “Nothing here. Good, we ruled it out,” not “You failed this step.” It redirects search-related side quests instead of rewarding them.

## Visual direction

An adult field guide, softened for a stressful moment: deep plum, mineral teal, rose, coral ember, and ivory. Rounded geometry is paired with editorial type scale, trail-line illustrations, generous touch targets, and restrained animation. It must not look clinical, childish, or like a generic AI dashboard.
