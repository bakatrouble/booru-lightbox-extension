# Booru Lightbox

A browser extension (Firefox/MV2 primary) that injects a shadow-root lightbox
viewer on booru/gallery sites: click a thumbnail to open the full-size image
or video, navigate with arrows/drag, zoom with wheel/pinch, and upload the
current slide to an external uploader extension via hotkey.

Built with [WXT](https://wxt.dev/) + Vue 3 + Pinia + Tailwind CSS.

## Supported sites

| Site                                                             | Hosts                                 |
| ---------------------------------------------------------------- | ------------------------------------- |
| e621 / e926                                                      | `e621.net`, `e926.net` (+ subdomains) |
| FurAffinity                                                      | `furaffinity.net`                     |
| Gelbooru                                                         | `gelbooru.com`                        |
| InkBunny                                                         | `inkbunny.net`                        |
| Rule34                                                           | `rule34.us`                           |
| RealBooru                                                        | `realbooru.com`                       |
| SankakuComplex                                                   | `idol.sankakucomplex.com`             |
| yande.re                                                         | `yande.re`                            |
| [Local dev gallery](https://github.com/bakatrouble/autoindex-rs) | `localhost:8474`, `127.0.0.1:8474`    |

Host matching is exact-or-subdomain (`evilgelbooru.com` does not match
`gelbooru.com`); see `tests/unit/domains.test.ts`.

## Repo map

- `entrypoints/lightbox.content/` — the content script: `App.vue` (scan +
  mount wiring), `components/` (viewer shell `LightBox.vue`, zoom/pan
  `SlideContent.vue`, `VideoPlayer.vue`, `Locate.vue`), `stores/` (Pinia:
  viewer, media, page, upload, locate), `composables/` (keyboard wiring,
  slide viewport math), `websites/` (one per-site adapter + `_helpers.ts`
  with shared `fetchDocument`), `mount.ts`, `mediaType.ts`, `utils.ts`.
- `entrypoints/background.ts` — CSP relaxation for e621/e926/gelbooru media.
- `entrypoints/options/` — options page (Gelbooru API key in
  `browser.storage.sync`).
- `entrypoints/test-page/` — offline viewer harness (dev only, not shipped).
- `tests/` — `unit/` (vitest + jsdom) and `e2e/` (Playwright + headless
  Chromium); see `tests/README.md`.
- `utils/` — `signExtension.ts` (`pnpm sign`) and `updateManifest.ts`
  (`pnpm update-manifest`) for the AMO release flow.
- `wxt.config.ts` — extension config and manifest. `web-ext.config.ts` is
  local-only (gitignored); copy from `web-ext.config.ts.example`.

## Develop

```sh
pnpm install
pnpm dev              # Chromium
pnpm dev:firefox      # Firefox (uses web-ext.config.ts when present)
```

`pnpm dev` also serves the `test-page` entrypoint: a fake `.media` gallery
that mounts the real lightbox with no booru needed. Path aliases
(`~lightbox`, `~options`, `~testpage`) are defined in `wxt.config.ts`
`alias` and mirrored for vitest in `vitest.config.ts`.

## Build

```sh
pnpm build              # Chromium
pnpm build:firefox      # Firefox
pnpm zip:firefox        # shippable zip
```

## Test

```sh
pnpm test         # unit + e2e
pnpm test:unit    # vitest only
pnpm test:e2e     # Playwright only (serves its own harness on port 5199)
pnpm lint         # biome
pnpm typecheck    # tsc --noEmit
```

Details and conventions (including the `it.fails` pin convention) are in
`tests/README.md`.

## How to add a site

1. Copy `websites/yandere.tsx` (pure DOM scraping) or `websites/local.tsx`
   (smallest adapter) into `websites/<site>.tsx`.
2. Implement `callback()` returning `{ el, item }` pairs (`src`, `type`,
   optional `pageUrl`/`label`), set `domains`, and optionally
   `getPrevPageUrl`/`getNextPageUrl`/`rescanInterval`.
3. Register the module in `websites/index.ts` (`collectImagesModules`).
4. Add a fixture + case in `tests/unit/` (see `tests/README.md` "To cover a
   new site").

Adapters needing a full-post fetch share `fetchDocument` from
`websites/_helpers.ts`. Gelbooru is the exception: it queries the dapi JSON
API, with the key falling back to `import.meta.env.VITE_GELBOORU_API_KEY`
when no stored key exists.

## Release (Firefox)

Publication is done locally, deliberately — there is no CI publish job.

```sh
pnpm build:firefox
./sign.sh   # needs AMO_KEY / AMO_SECRET in .env (gitignored, never commit)
```

`sign.sh` sources `.env`, then runs `pnpm sign` (sign via AMO API) and
`pnpm update-manifest` (publish the update manifest for self-hosted
updates, see `updateManifestUrl` in `wxt.config.ts`).
