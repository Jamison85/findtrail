# FindTrail 2.14 feather review

[Real-time 390 × 844 recording](390-realtime.mp4) · [360px release](360-release.png) · [360px approach](360-approach.png) · [360px contact](360-first-contact.png) · [360px floating](360-floating.png) · [390px release](390-release.png) · [390px approach](390-approach.png) · [390px contact](390-first-contact.png) · [390px floating](390-floating.png)

The recorded browser runs the actual Reset screen and water video in real time. Both viewport sets also include `free-drift`, `before-contact`, and `settled` PNG frames. `geometry.json` reports the projected visible quill tip and the water video's contact point at contact, settling, floating, and after a live viewport resize. The largest measured error was under 1px.

## Artwork decision

The existing `findtrail-natural-feather-v2.webp` is a 384 × 576 lossless WebP with alpha. Its visible alpha bounds are x=83–324 and y=20–539. Inspection shows a curved asymmetric vane, individual uneven barbs, a fine warm quill, translucent ivory edges, and no rectangular matte. Its visible quill tip was measured at 54.3% × 93.4%. It already meets the requested natural artwork standard, so it is retained and remains precached by the service worker. The rendered pose now includes mild time-varying vane shear and foreshortening; the artwork is not only rotated as a rigid sticker. A future replacement should preserve a transparent 2:3 canvas and supply measured mass and tip coordinates to `featherFlight.ts`.

If a new artwork pass is commissioned, deliver a transparent 384 × 576 or larger lossless WebP: one curved, asymmetrical ivory feather, a readable slender shaft, individually irregular barbs, soft sunset transmission, and no baked shadow or rectangular fringe. A companion pair of slightly flexed vane poses would allow local bending while keeping the same quill tip and canvas registration. Record the tip and mass coordinates for each pose; test alpha edges over both the dark mountain and bright reflection. No new asset is required for this implementation.

## Motion and synchronization

`featherFlight.ts` evaluates deterministic cubic Hermite air-current curves. Explicit velocities at the curve knots prevent a positional or velocity jump. Uneven lateral reversals, two reduced-descent-speed moments, gentle yaw and pitch, and slight shear create the airborne motion. The feather rotates around its measured mass center in free drift. During approach, placement blends smoothly toward a tip-anchored pose. At 12 seconds its quill touches the original lake video's impact point. Settling and floating are bounded below one pixel of lateral motion; no breathing cycle can restart the descent.

The Reset's 36-second breathing clock, feather pose, and water playback all derive from the same `startedAt` timestamp. A hidden tab stores elapsed time and pauses. Resuming restores the prior pose and seeks the existing water event to its current age. Reduced motion renders the final feather pose on the still lake without playing the video. One animation frame loop updates only transforms; dimensions are read on mount and resize.

## Reproduce

Run `npm ci`, `npm run dev -- --host 127.0.0.1`, then `npm run preview:feather` in another terminal. The capture script needs Chromium and Playwright’s FFmpeg binary (`npx playwright install ffmpeg`) and system `ffmpeg`; `CHROMIUM_PATH` and `FINDTRAIL_URL` can override the defaults. Unit tests run with `npm test`; the production build runs with `npm run build`.

The screenshots and recording are Chromium captures at mobile viewport sizes. Visual performance on a physical Android handset still requires review before approval.
