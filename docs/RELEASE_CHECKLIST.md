# Release checklist

## Automated

- [x] Typecheck passes
- [x] Unit and component tests pass
- [x] Production build passes
- [x] Dependency audit has no high or critical production vulnerability
- [x] CI passes on the production branch

## Functional

- [x] Home custom-item sheet opens and submits without changing page height
- [x] Home recent-find card opens the matching history detail
- [x] First-run onboarding appears before Home and can resume after an interrupted first visit
- [x] First-use Home state remains useful without saved history
- [x] Common-item and custom-item searches complete
- [x] Clue answers visibly change trail order
- [x] Refresh restores the active search
- [x] Found location is saved and promoted on the next matching search
- [x] Saved home outranks learned guesses but not safety guidance
- [x] Successful search areas improve later trail order
- [x] Custom item can be pinned and launched from Home
- [x] Item-specific next actions appear after the first trail
- [x] Backup round-trips and malformed backups are rejected
- [x] Installed-app update notice preserves user control
- [x] History can be cleared only after confirmation
- [x] History summarizes learned locations, ranks repeated useful patterns first, and restarts the matching search
- [x] Settings separates guidance, appearance, saved homes, backup, and destructive controls
- [x] iPhone Home Screen instructions remain available from Settings after the first-use coach
- [x] Calm reset resumes the correct screen
- [x] Ambient horizon reset completes three truthful 10-second cycles
- [x] Reset has no sound control or audio path
- [x] Feather-contact ripple is clearly visible without overpowering the reset, and reduced motion receives a still horizon
- [x] Update notices wait until a root screen and never shrink the reset
- [x] Clue selections settle before advancing and skip delay with reduced motion
- [x] Last checked exact spot carries into the found-place screen
- [x] Final trail stop opens a clear item-specific recovery plan
- [x] Speech features fail gracefully when browser support is absent
- [x] Offline app shell opens after one successful online visit

## Visual and accessibility

- [x] FindTrail 2.12 search journey at 360 × 800 Android viewport
- [x] FindTrail 2.12 search journey at 412 × 915 Galaxy-class viewport
- [x] FindTrail 2.12 search journey at 430 × 932 iPhone-class viewport
- [x] FindTrail 2.12 search journey at 768 × 1024 tablet viewport
- [ ] FindTrail 2.12 ambient reset at 360 × 800 Android viewport
- [ ] FindTrail 2.12 ambient reset at 412 × 915 Galaxy-class viewport
- [ ] FindTrail 2.12 ambient reset at 430 × 932 iPhone-class viewport
- [ ] FindTrail 2.12 ambient reset at 768 × 1024 tablet viewport
- [x] Keyboard-only navigation
- [x] Visible focus states and logical focus order
- [x] 200% text zoom without lost controls
- [x] Reduced-motion preference
- [x] Screen-reader labels and live announcements
- [x] 1200 × 630 social preview and 412 × 915 install screenshots

## Device approval

- [ ] Install on Jamo's Galaxy S25 Ultra
- [ ] Complete one real lost-item search
- [ ] Confirm home screen, voice behavior, and app restart recovery
