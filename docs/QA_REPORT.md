# FindTrail 2.12 QA report

Run date: 2026-09-22

## Automated release checks

| Check | Result |
| --- | --- |
| TypeScript typecheck | Pass |
| Vitest unit and component tests | Pass: current unit and component suite |
| Vite production build | Pass |
| Production dependency audit | 0 vulnerabilities |
| Home artwork optimization | Pass: 1536 × 1024 WebP, 132 KB |
| First-run onboarding | Pass: onboarding renders before Home, completion is remembered, and an empty auto-saved record does not strand a half-finished first run |
| iPhone install guidance | Pass: one-time instructions defer until after onboarding and can be reopened later from Settings |
| Reset icon language | Pass: all actions that launch the reset use the same natural feather mark |
| Find-another handoff | Pass: the success action returns to and focuses the Home item picker instead of duplicating Back home |
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
| Success confirmation | Pass: the saved location, places visited, elapsed time, and home/history result are stated explicitly |
| History learning | Pass: found records become per-item likely-place summaries, with repeated locations ranked ahead of newer one-off finds |
| History repeat search | Pass: learned-place and expanded-record actions restart the matching item trail |
| History disclosure | Pass: recent entries expose exact place, places checked, search time, and date without crowding the list |
| Settings organization | Pass: search, appearance, saved homes, private data, backup, and destructive controls remain distinct |
| Saved-home editing | Pass: exact-place edits, custom-item pinning, and confirmed removal retain their existing behavior |
| Settings safety | Pass: clearing history remains confirmed and disabled when empty; failed restores use explicit error semantics |
| Recovery ending | Pass: the final stop becomes a calm, ordered, item-specific next-moves plan |
| Recovery safety priority | Pass: urgent medicine and financial protection remain ahead of reset and repeat actions |
| Recovery exits | Pass: reset, repeat, late find, and save-and-leave keep their existing behavior |
| Ambient reset regression | Pass: three timed breaths, progress semantics, skip, and trail return remain functional |
| Reset rendering | Pass: still-lake artwork, natural feather motion, living water, strengthened contact ripple, and reduced-motion fallback |
| Reset audio | Pass: sound controls and audio generation are absent |
| Focused-screen notices | Pass: update-ready notices wait for Home, History, or Settings instead of interrupting an active search or reset |
| Hosted GitHub Actions | Pass: PR #30 Production checks |

## Browser and resilience checks

- The Home layout uses a fixed no-scroll composition at standard text sizes and deliberately restores scrolling for large-text accessibility mode.
- Custom-item entry opens in a focused modal sheet instead of increasing the Home page height.
- The latest-found card opens the exact expandable history entry; first use has a purposeful empty state.
- History separates learned places from chronological search records and limits the shortcut area to three useful item patterns.
- History rows have unambiguous accessible names even when an item was found in the same place more than once.
- Settings begins with a local-only privacy summary and keeps destructive history clearing inside the data section.
- Settings controls and saved-home editing retain comfortable touch targets and reflow at narrow widths and large text.
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

- Confirm the 2.12 onboarding, History, Settings, and Reset screens on the hosted build at 360 × 800, 412 × 915, 430 × 932, and 768 × 1024.
- Install on Jamo's Galaxy S25 Ultra and complete one real search.
- Confirm microphone permission and speech behavior on the actual device/browser.
