# Tests

## Commands

- `pnpm test` — unit + headless e2e
- `pnpm test:unit` — vitest only (`vitest run`)
- `pnpm test:e2e` — Playwright only (spawns its own web server)

## Unit (`tests/unit`, vitest + jsdom)

- `utils.test.ts` — `resolveScalarOrFunction`, `formatDuration`.
- `domains.test.ts` — all nine adapters resolve for their hosts (exact +
  subdomain matrix) and lookalike domains (`evilgelbooru.com`,
  `gelbooru.com.evil.com`, …) resolve to nothing.
- `lightbox-state.test.ts` — Track 1 interaction pins via `@vue/test-utils`
  (real `LightBox` + `SlideContent`, stubbed icons, Pinia seeded directly —
  `LightBox` takes no props since the store migration): held-keys leak (1.4),
  preview-instead-of-full upload (1.5), scroll-blocker leak (1.2). Each is
  `it.fails` until its fix lands.
- `console-noise.test.ts` — Track 1.8 guards (background CSP rewrite, Slider
  drag, Locate render emit no `console.log`).
- `setup.ts` — stubs the `browser` WebExtension global (storage, runtime,
  webRequest) and the `defineBackground` WXT global, resets the DOM between
  tests.
- `viewer-store.test.ts` — Pinia viewer store: open/slide/close transitions,
  scan binding + click-to-open, rescan skip when bound, and the by-design
  list-replace-and-close on fresh results. No component mounting needed.
- `media-store.test.ts` — load window around the index, entry preservation
  for surviving elements across list replacement, preview visibility flags.
- `slide-viewport.test.ts` — pan/zoom math with no mounting: centering, fit
  ratios, wheel/pinch zoom + gates, drag pan + edge clamping, unzoom,
  double-click. Gesture states are plain fakes; window size is fixed via
  `innerWidth`/`innerHeight`.
- `page-store.test.ts` — in-list stepping, past-end counters + reset on
  slide, neighbouring-page jump (via a fragment-only URL — jsdom cannot
  perform real page navigation).
- `video-player.test.ts` — toolbar auto-hide (idle hide, mousemove reshow +
  reschedule, lock, Space toggle, non-current ignore, slide-away detach)
  via a stub host with document-level events; press-to-toggle (click
  toggles, drag doesn't, stray release doesn't); Teleport integration (real
  `VideoPlayer` — toolbar renders in place until `loadedmetadata`, then
  moves to the store target); buffered ranges (seek tail arriving via
  `seeked` with no `progress` is reported). Each case unmounts —
  listeners live on `document`.
- `websites.dom.test.ts` — DOM-only adapters (e621, yandere, local) against
  HTML fixtures in `tests/unit/fixtures/`.
- `websites.gelbooru.test.ts` — dapi API adapter with `ky` mocked; asserts
  lazy fetching and the stored API key being appended.
- `websites.pages.test.ts` — post-page-scraping adapters (rule34,
  furaffinity, inkbunny, sankakuComplex, realbooru) with `ky` mocked.
- `setup.ts` — stubs the `browser` WebExtension global and resets the DOM
  between tests.

To cover a new site: add a list-page fixture plus a case calling the
adapter's `callback()` and resolving items via `resolveScalarOrFunction`.

## E2E (`tests/e2e`, Playwright + headless Chromium)

- `harness/` — a minimal Vite app that mounts the real `App.vue` with a
  three-image fake adapter and local SVG assets (works offline).
  `harness.css` points Tailwind's scanner at `entrypoints/` — without it,
  viewer utility classes are never generated and the hidden overlay
  intercepts clicks.
- `specs/viewer.spec.ts` — open on click, image render, arrow navigation,
  Escape close + hash clear, `#slide=` deep link, close button, fresh-open
  drag navigation, zoom recovery across close/reopen (1.3 guard), and a
  `test.fail()` pin for SlideContent console noise (1.8).

`playwright.config.ts` serves the harness on port 5199 (5173 was taken by
another project on this machine).
