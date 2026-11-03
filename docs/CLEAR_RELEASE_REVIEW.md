# FindTrail CLEAR release review

Reviewed 2026-11-03 on `feat/clear-focus-integration`. The existing CLEAR design and search engine remain the baseline. No production deployment or merge was performed.

## Experience evidence

- [Opening, 390 px](clear-release-evidence/opening-390.png)
- [Final focus, 390 px](clear-release-evidence/final-390.png)
- [Full real-time progression, 390 px](clear-release-evidence/full-progression-390.webm)
- [Final focus, 360 px](clear-release-evidence/final-360.png)
- [Final focus, 430 px](clear-release-evidence/final-430.png)
- [Large text, 320 px](clear-release-evidence/large-text-320.png)

I reran the complete real-time recording and reviewed frames through the headline handoff. The opening gives the person time without requiring input. Haze and color settle while the lake remains lit, then the card emerges from the same scene. The final coral button is the clear next action. The photographic lake, plum and teal atmosphere, typography, and card structure are preserved.

## Changes

- Removed the saved-search write that occurred on opening CLEAR. The return destination now lives in browser history state, including across a reload or browser Back navigation. Existing saved `resetReturn` values remain readable for older interrupted visits.
- Corrected the no-search exit wording and made “Begin a search” focus the item picker.
- Refined the scene from soft haze to a clearer, gently less saturated finish without losing the warm horizon; improved small-screen safe-area padding and wrapped-button spacing.
- Made the visible exit label the accessible name and supplied a separate description about preserved progress.
- Bumped the service-worker cache version so installed copies receive the refined assets.
- Removed a faint opening-headline ghost behind the final headline during the transition. The final visible headline is now a level-one heading for screen readers. Bumped the cache version again for this refinement.
- Allowed the browser review script to use an already installed Chromium binary through `CHROMIUM_PATH`; CI still uses Playwright's installed browser by default.

## Validation

- `npm run check`: 18 test files, 118 tests passed; typecheck and production build passed.
- `node scripts/browser-qa.mjs`: passed at 320, 360, 390, and 430 px for CLEAR, including large text and reduced motion. No horizontal overflow, header collision, or clipped primary action was found. Home was also checked at 320, 360, 390, 412, 430, and 768 px.
- A real search checked one spot before CLEAR. The final card named the next unchecked spot. Returning restored the same trail heading, and the complete saved search object remained unchanged. Unit tests cover safety priority, skipped and excluded places, clue and widening flows, and no-search behavior.
- Keyboard focus reaches the final action from the final heading. The polite status announces the next step. An axe-core WCAG 2.1 AA scan of the large-text final state found zero violations. Its automated color-contrast rule could not determine contrast for 14 nodes over photographic or translucent surfaces; those states were inspected visually.
- A browser visibility-event interruption paused progression for five seconds and resumed without jumping. A production-build offline reload retained the search and loaded all five precached photographic and reset media assets.
- Headless Chromium at 390 × 844 px recorded a 16.7 ms median frame interval and a 16.8 ms 95th percentile during the 6.6-second motion sample, with no interval over 50 ms in the final run. This is an emulated browser measurement, not a physical-device benchmark.

## Remaining limits and release assessment

The mobile checks use Chromium emulation. Physical Android safe-area rendering and TalkBack or VoiceOver speech still need a device spot-check. The headless browser does not mark background tabs hidden, so the visibility handler was exercised with a dispatched visibility event in Chromium and with unit tests.

**Assessment:** review-ready on the CLEAR feature branch. Production release remains pending explicit approval and the physical-device spot-check.
