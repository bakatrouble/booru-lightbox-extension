# Tests

## Commands

- `pnpm test` — unit + headless e2e
- `pnpm test:unit` — vitest only (`vitest run`)
- `pnpm test:e2e` — Playwright only (spawns its own web server)

## Unit (`tests/unit`, vitest + jsdom)

- `utils.test.ts` — `resolveScalarOrFunction`, `formatDuration`.
- `domains.test.ts` — all nine adapters resolve for their hosts, unknown
  hosts resolve to nothing. Contains one `it.fails` case documenting the
  known substring-matching defect (`evilgelbooru.com` currently matches);
  it will flag as soon as the matcher is fixed.
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
  Escape close + hash clear, `#slide=` deep link, close button.

`playwright.config.ts` serves the harness on port 5199 (5173 was taken by
another project on this machine).
