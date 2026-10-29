# FindTrail

FindTrail is a calm, local-first progressive web app for finding misplaced items. It turns a frantic whole-house search into one useful place at a time, remembers where items were found, and gently promotes likely locations during future searches.

Version 2.13 is in review on the implementation branch. Home now opens immediately, with the introduction available through **How it works**. The approved Night Orchard and Mineral Ember palette is applied across the existing screens. Activity clues lead the short trail when relevant; a dead phone does not suggest ringing. Reset has one feather descent and one water impact while the three breathing cycles continue. Interrupted searches, unfinished areas, Found drafts, backups, and offline access retain their existing local data format. This branch has not been deployed.

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

See [docs/QA_REPORT_2.13.md](docs/QA_REPORT_2.13.md) for this branch’s evidence, the [2.12 QA report](docs/QA_REPORT.md) for historical validation, and [docs/RELEASE_CHECKLIST.md](docs/RELEASE_CHECKLIST.md) for the remaining approval steps.

## Deployment

Merges to `main` are verified and published to GitHub Pages by the included workflows. A Cloudflare Workers static-assets configuration is also included for an alternate production host:

```bash
npm run deploy
```

## Privacy

Search progress, preferences, saved home spots, custom-item shortcuts, and found-item history remain in browser storage on the current device. FindTrail has no account system, analytics, advertising, or remote database. A portable JSON backup is created only when the user explicitly exports one.

The `public/_headers` policy applies to compatible hosts such as Cloudflare Workers. GitHub Pages does not apply this file, so verify headers on the actual host. Browser voice commands may use the browser vendor’s speech provider after the user opts in; Read aloud downloads a free model and generates speech locally when supported.
