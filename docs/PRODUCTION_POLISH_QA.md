# Production aesthetic pass

This pass preserves FindTrail’s warm paper, evergreen and clay palette, serif headings, home artwork, search behavior, and approved feather flight and ripple timing.

## Changes

- Shared 12px caption token replaces undersized labels across Home, clues, search, recovery, found, History, Settings, and onboarding. Large-text mode scales the token normally.
- Multi-line headings have more comfortable line spacing.
- Clay text and the Found it action have stronger contrast. Text inputs use a consistent caret and placeholder treatment.
- Saved locations wrap in History so the useful detail is readable. Home’s recent-find labels stack cleanly.
- Small actions and the install dialog close control have larger tap targets. Keyboard focus stays inside clipped History cards; Reset uses a light focus ring against its dark scene.
- Home can scroll on short portrait and landscape screens instead of hiding the item picker.

## Validation

- TypeScript check, all 99 existing tests, and production build passed.
- Browser screenshots reviewed at 320 × 740, 412 × 915, and 1280 × 900: Home, custom item dialog, all three clues, place exclusions, standard trail, phone finder, urgent medicine, wider search, recovery, found/default and optional details, complete, empty/populated/expanded History, empty/populated Settings, Reset, all onboarding pages, and large-text Home/Settings.
- Additional checks cover 320 × 568 and 844 × 390, a long custom item label, large text, offline/update banners, keyboard switch focus, and the iPhone install dialog’s close button focus and Escape dismissal.
- Reset animation code and timing are unchanged; the existing flight and ripple tests pass.

Browser checks used local Chromium with the production build, including an iPhone user-agent context for install guidance. Native Safari and physical-device release checks remain part of the existing release checklist.
