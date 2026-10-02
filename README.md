# FindTrail

FindTrail is a calm, local-first progressive web app for finding misplaced items. It turns a frantic whole-house search into one useful place at a time, remembers where items were found, and gently promotes likely locations during future searches.

Version 2.12 finishes the first-run and search-polish pass. New users get a short three-step onboarding before Home loads, iPhone users keep reusable Home Screen install guidance, Reset uses the natural feather consistently, learned History shortcuts prioritize repeated useful locations, and update notices wait for a root screen instead of interrupting an active search. The production Home, clue flow, focused and wider trails, Found learning, Still Missing recovery, feather-and-water breathing reset, local voice, backup and restore, offline shell, and local-first privacy model remain intact.

## Search improvements

- Changing clues preserves checked spots, skipped places, and search identity, including through reloads and backups.
- After an unsuccessful route, **Try new places** offers a short pass through alternatives outside earlier routes. Earlier skipped areas remain available to review.
- Recovery advice distinguishes cash from cards, dead phones from phones that can ring, and house/work keys from car keys.
- Phone searches link to Apple Find My and Google Find Hub in separate tabs.
- **Places to leave out** lets users exclude and re-include areas for the current search. **Already checked this whole area** records an area in one tap. Safety guidance remains available.
- Repeating a trail deliberately resets that route's checklist; it preserves checks from earlier routes.

## Product principles

- One decision or search area at a time
- Useful without an account, connection, or setup ritual
- Support attention without talking down to the user
- Remember patterns locally and explain why a stop is suggested
- Humor can lower tension; it must never shame the user
- Accessibility and reduced-motion support are release requirements

## Local development

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run check
```

See [docs/QA_REPORT.md](docs/QA_REPORT.md) for the current release evidence and [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for the remaining physical-device approval.

## Deployment

Merges to `main` are verified and published to GitHub Pages by the included workflows. A Cloudflare Workers static-assets configuration is also included for an alternate production host:

```bash
npm run deploy
```

## Privacy

Search progress, preferences, saved home spots, custom-item shortcuts, and found-item history remain in browser storage on the current device. FindTrail has no account system, analytics, advertising, or remote database. A portable JSON backup is created only when the user explicitly exports one.
