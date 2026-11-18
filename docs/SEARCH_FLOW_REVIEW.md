# Search flow usability pass

2026-11-18. Based on `main` at `c8a891c`.

## Problems and resulting behavior

1. Every new search required all three clues and a build action. After the essential item question, **Start with likely places** now uses existing answers, saved homes and learned locations immediately. Unanswered clues stay unanswered. Users can add them through **Clues** during a search. Item-specific safety steps and dead-phone handling remain intact.
2. Changing clues rebuilt a short route containing completed areas. The rebuilt route now removes fully checked ordinary areas before filling the two short passes. Partial and skipped areas remain eligible. Completed progress, search identity, original start time and backup compatibility remain preserved. Safety and final-sweep steps remain available. Wider-search copy reflects the actual number of remaining places, including a single place.
3. The Home resume card described the last area even when the saved destination was a wider-search checkpoint, recovery plan or edited clues. It now describes the checkpoint the Resume action actually opens, including found drafts and skipped-place review.

The approved Night Orchard palette and existing search structure are retained. No new dependency, account, data format or remote data collection is introduced. The service-worker version changes so installed users can receive the new build. The separate Reset proposals in PRs #72 and #73 are not included.

Browser review also surfaced repeated checklist movement at a pointer boundary. Checklist hover feedback now changes the surface without moving its hit area; pressed feedback is retained.

The screenshots exposed inherited light recovery panels and dark skipped-place labels within the dark palette. These surfaces and labels now use the approved dark theme tokens. Browser QA checks at least 4.5:1 contrast on recovery instructions, the next-pass heading and skipped-place buttons. Enlarged clue choices reflow to one column instead of splitting short labels across several lines.

## Verification

- Baseline: `npm run check`, 109 tests passed with TypeScript and production build.
- Updated: `npm run check`, 122 tests passed with TypeScript and production build.
- Tests cover optional-clue startup, saved-home priority, medicine/card safety, dead phones, retained activity answers and checks, checkpoint descriptions and destinations, filtering before compacting, backup preservation, and all-areas-complete behavior.
- `scripts/search-flow-qa.mjs` exercises the production build at 320, 360, 390, 412, 430 and 768px, keyboard activation, reloads, clue edits, completed-area exclusion, wider/recovery checkpoints, 200% text, and the animated quick-start handoff. The dedicated workflow preserves its screenshots.
- Local Chromium could not launch because the workspace denied its process socket. Browser evidence is therefore collected by the GitHub Actions browser workflow, not claimed as a local pass.

Physical Galaxy S25 Ultra and iPhone checks remain necessary for device-specific input, installed-app updates and performance. This review branch does not merge either Reset proposal.
