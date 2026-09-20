# FindTrail

FindTrail is a calm, local-first progressive web app for finding misplaced items. It turns a frantic whole-house search into one useful place at a time, remembers where items were found, and gently promotes likely locations during future searches.

Version 2.5 brings the active search trail up to the same production standard as Home and Reset. Each stop now presents one unmistakable destination, tactile exact-spot progress, integrated read-aloud and hands-free help, a restrained transition to the next place, and a calmer action dock. The 30-second feather-and-water reset, learned locations, item-specific recovery actions, local backup and restore, and update-ready notices remain intact.

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
