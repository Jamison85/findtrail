# FindTrail 2.7 QA report

Run date: 2026-09-21

## Automated release checks

| Check | Result |
| --- | --- |
| TypeScript typecheck | Pass |
| Vitest unit and component tests | 44 passed across 9 files |
| Vite production build | Pass |
| Production dependency audit | 0 vulnerabilities |
| Home artwork optimization | Pass: 1536 × 1024 WebP, 132 KB |
| Offline shell inclusion | Pass: versioned artwork is pre-cached |
| Home motion regression | Pass: plays once per session and settles |
| Item handoff regression | Pass: selected tile settles before the first clue appears |
| Clue journey regression | Pass: answers settle before advancing and reduced motion skips the delay |
| Active Trail hierarchy | Pass: destination, instruction, exact spots, progress, assistance, and actions are explicit |
| Exact-spot progress | Pass: checked state, area completion, and next-place copy update without changing trail order |
| Stop handoff | Pass: full-motion mode settles the current card before advancing; reduced motion advances immediately |
| Found-place carry-forward | Pass: the last checked exact spot is ready to save automatically |
| Found capture | Pass: one exact place is the only required input; suggestions and manual entry share one controlled value |
| Found learning | Pass: successful search area, found history, saved home priority, and custom-item pinning retain their existing behavior |
| Success confirmation | Pass: the saved location, places checked, elapsed time, and home/history result are stated explicitly |
| Recovery ending | Pass: the final stop becomes a calm, ordered, item-specific next-moves plan |
| Recovery safety priority | Pass: urgent medicine and financial protection remain ahead of reset and repeat actions |
| Recovery exits | Pass: reset, repeat, late find, and save-and-leave keep their existing behavior |
| Ambient reset regression | Pass: three timed breaths, progress semantics, skip, and trail return remain functional |
| Reset rendering | Pass: still-lake artwork, natural feather motion, living water, contact ripple, and reduced-motion fallback |
| Reset audio | Pass: sound controls and audio generation are absent |
| Focused-screen notices | Pass: update and offline notices remain reachable during an active search |
| Hosted GitHub Actions | Pass: PR #22 production checks, run #153 |

## Browser and resilience checks

- The Home layout uses a fixed no-scroll composition at standard text sizes and deliberately restores scrolling for large-text accessibility mode.
- Custom-item entry opens in a focused modal sheet instead of increasing the Home page height.
- The latest-found card opens the exact expandable history entry; first use has a purposeful empty state.
- Clue, trail, found, settings, ambient reset, pinned-item home, saved-home trail, and item-specific ending retain responsive max-width and overflow safeguards.
- 200% text enlargement reflows without horizontal overflow or lost controls.
- Keyboard entry reaches the skip link first, then exposes visible focus on controls.
- Reduced-motion preference replaces the moving horizon with a still composition and suppresses the Home guide.
- The reset uses three honest 10-second cycles: 4 seconds in and 6 seconds out.
- The reset has no sound control or audio path.
- The restored reset returns to the exact active trail stop and respects reduced motion.
- The Home search guide uses brief, non-looping motion and does not replay after returning Home in the same session.
- Item tiles use a tightened shadow and sage icon well while handing the selection into the first clue.
- Clue choices use a compact two-column route at standard text size and return to a single column for large-text mode.
- Active-stop headings receive focus as each new search area appears.
- Active stops keep the next destination, exact-spot checklist, read-aloud help, hands-free mode, reset, success, and next-place actions within one coherent hierarchy.
- Full-motion stop changes use one short directional handoff; reduced-motion mode removes it.
- The Still Missing screen reports completed search work, presents one priority step before the remaining plan, and keeps urgent guidance visually distinct.
- Recovery controls retain comfortable touch targets and reflow into a single column for large-text mode.
- A checked exact spot carries into the found-place field instead of asking the user to remember it again.
- The Found screen offers exact spots rather than storing a broad search-area heading as the final location.
- The success path explains the difference between automatic trail learning and an optional saved home spot.
- Found and confirmation controls reflow for larger text without hiding the exact-location input or save action.
- Active search survives reload.
- Saving a found place adds history and promotes that location on the next matching search.
- Saved home spots outrank learned guesses while urgent safety guidance remains first.
- Successful search-area history promotes the useful stop on later matching trails.
- Custom items can be pinned and relaunched from Home.
- Backups round-trip and malformed nested backup data is rejected.
- App shell reloads successfully with the browser forced offline after one online visit.
- Social sharing artwork is exactly 1200 × 630; install screenshots are exactly 412 × 915.

## Still required before final production approval

- Confirm the 2.7 Found and confirmation screens on the hosted build at 360 × 800, 412 × 915, 430 × 932, and 768 × 1024.
- Install on Jamo's Galaxy S25 Ultra and complete one real search.
- Confirm microphone permission and speech behavior on the actual device/browser.
