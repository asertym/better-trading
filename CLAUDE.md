# CLAUDE.md

Guidance for AI coding assistants working in this repository.

## Project Overview

**Better Trading+** is a browser extension that enhances the `pathofexile.com` trade site for **Path of Exile (PoE1)** and **Path of Exile 2 (PoE2)**. It is a fork of [poe-world/better-trading](https://github.com/poe-world/better-trading), rebuilt from the ground up with support for both Chromium (Chrome) and Firefox builds.

Core features:

- Bookmarks manager with folders, icons, drag ordering, and archiving; folder sharing via import/export plus file backup/restore
- Equivalent pricing calculator powered by [poe.ninja](https://poe.ninja/)
- Pinned items with quick navigation back to the original result
- Search history and descriptive browser-tab titles
- Merging multiple Live Searches into a single tab
- Wiki and PoEDB links on searched items
- Search filtering shortcuts and tilde autofill in stat/search inputs
- Browser Back/Forward navigation between trade searches

Key technologies: **WXT** (web-extension framework), **React 19**, **TypeScript**, **Zustand** (state), **TanStack Query** (data fetching/caching), **Tailwind CSS v4**, **Vite/Vitest**. The extension is a content script injected into the trade site's DOM plus a background service worker; it is not a standalone web app.

## Quick Start / Development Setup & Commands

```bash
# 1. Install dependencies (Node.js LTS + pnpm required)
pnpm install

# 2. Run in dev mode (separate persistent profiles live in .dev-profiles/)
pnpm run dev              # Chrome/Chromium
pnpm run dev:firefox       # Firefox

# 3. Validate changes before committing
pnpm run typecheck         # tsc --noEmit
pnpm test                  # vitest run

# 4. Build & package (generates archives in .output/)
pnpm run build             # Chrome
pnpm run build:firefox      # Firefox
pnpm run zip                # Chrome archive
pnpm run zip:firefox         # Firefox archive
```

A `Makefile` wraps the common workflows:

```bash
make install          # pnpm ci
make dev              # pnpm run dev
make dev-firefox      # pnpm run dev:firefox
make check            # typecheck + test + changelog check
make package          # package both browsers
make upload-firefox   # build and submit an existing AMO add-on for review
```

**Note:** `pnpm install` runs `wxt prepare` (postinstall) and installs git hooks via `prepare`. The `prebuild`/`prezip` scripts run the changelog check automatically.

## Core Architecture / Components

The extension is built on **WXT**, which compiles multiple entrypoints from `src/entrypoints/`. It is largely **synchronous DOM manipulation** driven by event listeners, with **async** data fetching (React Query + `fetch`) for external APIs. There is no server; all persistence is browser storage.

Main layers:

- **Entrypoints** (`src/entrypoints/`) — WXT-managed scripts:
    - `content.tsx` — the main content script, injected at `document_start` into `*://*.pathofexile.com/trade*`. It boots every feature via `startFeature(...)`, renders the React panel into a **shadow DOM** (`createShadowRootUi`), and wires up message listeners for item capture.
    - `background.ts` — service worker: registers the Live Search coordinator and answers runtime messages for poe.ninja price/currency lookups.
    - `item-capture.ts`, `live-search.ts`, `search-history.ts` — **unlisted scripts** injected into the page to intercept item data, live sockets, and navigation history.
- **App / UI** (`src/app/ContentApp.tsx`, `src/components/`, `src/features/`) — React panel rendered in a shadow root with three pages (Bookmarks, History, Pinned) plus About and Changelog views. Each feature is wrapped in a `FeatureBoundary` so one failing feature does not take down the rest.
- **Stores** (`src/stores/`) — lightweight **Zustand** stores: `settings` (disabled feature flags), `results` (captured items, capped at 2000), `pinned`, `panel`.
- **Controllers** (`src/lib/`) — orchestration logic such as `pageController.ts` (tab titles + history recording) and `resultsController.ts` (per-row DOM enhancers).
- **Integrations** (`src/integrations/`) — all website selectors, host events, external URLs, and API formats. Enhancers call these directly; feature decisions and UI stay out of this layer. See `docs/integrations.md` for the "what broke → where to look" map.
- **Models** (`src/models/`) — shared TypeScript types (items, live search, price trends, search).

Key design patterns:

- **Enhancer pattern with cleanup:** every feature starts via `startFeature(name, start)` (`src/lib/startFeature.ts`), which wraps startup in try/catch and returns a stop function. Cleanup functions are registered with `ctx.onInvalidated(...)` so subscriptions/listeners are torn down when the page invalidates.
- **Fail-open / graceful degradation:** all external calls route failures through `reportIntegrationIssue(integration, operation)` (`src/integrations/diagnostics.ts`), which logs a deduplicated `console.warn`. Missing optional data must leave unrelated enhancements working — never let one integration failure break the panel.
- **Live Search coordinator (background-owned):** discovery and tab handoff live in the background worker (`src/lib/liveSearch/background.ts`, `coordinator.ts`); socket subscriptions stay in each destination page.
- **React Query** is used for data fetching/caching of bookmarks, history, and poe.ninja prices; `browser.storage.onChanged` invalidates the relevant query keys.

## Key Files & Responsibilities

| File                                                                      | Responsibility                                                                                                                          |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/entrypoints/content.tsx`                                             | Boots all content-script features, mounts the React panel into a shadow root, wires item-capture messages and storage-change listeners. |
| `src/entrypoints/background.ts`                                           | Registers the Live Search coordinator; handles `item-sparklines` / `currency-ratios` runtime messages via poe.ninja.                    |
| `src/app/ContentApp.tsx`                                                  | Top-level React panel: page navigation, collapse toggle, About view, per-page feature boundaries.                                       |
| `src/stores/settings.ts`                                                  | Feature flags (`enhancerIds`, `searchEnhancementIds`) and opt-in migration logic; persisted to `localStorage`.                          |
| `src/lib/startFeature.ts`                                                 | Standard enhancer startup/cleanup wrapper used by every content-script feature.                                                         |
| `src/lib/pageController.ts`                                               | Records search history and writes descriptive tab titles (bookmark match + recommended title).                                          |
| `src/lib/resultsController.ts`                                            | Applies per-row DOM enhancers to captured results.                                                                                      |
| `src/lib/searchEnhancements.ts`                                           | Tilde autofill, meta-tag coloring, focus shortcuts, and shortcut consumption in the search inputs.                                      |
| `src/lib/searchShortcuts.ts`                                              | Consumes typed filter tokens (e.g. `il;40`) against `searchShortcutDefinitions.ts`.                                                     |
| `src/lib/liveSearch/background.ts` / `coordinator.ts`                     | Background-owned discovery, merge, and handoff of Live Search tabs.                                                                     |
| `src/lib/bookmarks/storage.ts`                                            | Bookmark folder/trade persistence (Zustand-free) with `Trade`/`Folder` types and safe `removeFolder`.                                   |
| `src/lib/prices/itemPrices.ts`                                            | poe.ninja item price fetching with `browser.storage.local` caching (1 h TTL) and 429 rate-limit handling.                               |
| `src/integrations/poe-trade/*`                                            | All pathofexile.com trade-site DOM/URL/socket adapters (search, results, capture, decode, navigation, live).                            |
| `src/integrations/poe-ninja/http.ts`                                      | poe.ninja economy API requests (`requestOverview`, `fetchCurrencyOverview`).                                                            |
| `src/integrations/item-references/links.ts`                               | Builds Wiki and PoEDB search links per game version.                                                                                    |
| `src/lib/releases/model.ts`                                               | Parses changelog Markdown into `Release` objects; validates section headers and versions.                                               |
| `scripts/check-changelog.ts`, `scripts/release.mjs`, `scripts/upload.mjs` | Release tooling: changelog validation, version bump/tagging, Firefox AMO submission.                                                    |

## Specific Integrations

- **poe.ninja** (host permission `https://poe.ninja/*`) — economy API for currency ratios and item prices.
    - `src/integrations/poe-ninja/http.ts` builds `/poe{1|2}/api/economy/{source}/overview?league=...&type=...` requests with a 15 s timeout and a custom `User-Agent`.
    - `src/lib/prices/itemPrices.ts` iterates item categories, caches each category in `browser.storage.local` for **1 hour** (`ttl = 3_600_000`), and stops new network requests after the first HTTP **429**.
    - Requests are dispatched from the background worker via runtime messages; results feed equivalent-pricing and sparkline enhancers.
- **pathofexile.com trade site** — DOM manipulation of search inputs, result rows, meta tags, and live WebSocket sockets. All selectors/adapters live in `src/integrations/poe-trade/`. Item data is captured by the `item-capture.ts` unlisted script and passed to the content script via `window.postMessage` (payload capped at 500 KB).
- **Wiki / PoEDB** — `src/integrations/item-references/links.ts` generates per-version links (`poewiki.net`/`poe2wiki.net`, `poedb.tw`/`poe2db.tw`).
- **Live Search sockets** — parsed in `src/integrations/poe-trade/live/protocol.ts`; coordination is background-owned.

## Hotkeys / In-App Commands

These are keyboard interactions handled inside the content script (not browser-extension commands):

- **Shift+F** — focus the item search input (`focus-item-search`).
- **Shift+S** — focus the stat filter input and expand it (`focus-stat-filter`).
- **Tilde autofill** — typing in a search/stat input auto-prepends `~` (`default-search-filter-tilde` / `default-stat-filter-tilde`).
- **Search filter shortcuts** — type tokens like `il;40`, `q;30-90`, `soc;6w`, `id;y` in the item search, then press **Space** or **Enter** to apply. Both `;` and `:` separators work. Applied shortcuts are removed from the input and expand their filter subsection; a second Enter submits the search. Full reference is generated by `pnpm run docs:shortcuts` into `docs/search-shortcuts.md` (source of truth: `src/integrations/poe-trade/filterDefinitions.ts` and `src/lib/searchShortcutDefinitions.ts`).
- **Clear all filters** — type `;clear` / `:clear` + Space/Enter to activate the site's Clear button.

## Data Storage / Persistence

There is **no database or backend**. All persistence is browser-native:

- **`browser.storage.local`** (via `src/lib/storage.ts`) — bookmarks (`bookmark-folders`, `bookmark-trades--<id>`), poe.ninja price cache, and history. Values are wrapped in an `{ value, expiresAt }` envelope; `getValue`/`setValue` handle expiry.
- **`localStorage`** (via `src/lib/preferences.ts`) — user preferences and the `bt-disabled-settings` feature flags. Deliberately separate from bookmark storage so a failed bookmark read never masquerades as an empty collection.
- **In-memory Zustand stores** — captured results (`useResultsStore`, capped at **2000** items), pinned items, panel state. Not persisted across sessions.
- **Dev profiles** — `web-ext.config.ts` points dev browsers to persistent profiles in `.dev-profiles/` so logins/test data survive restarts.

## Environment Configuration

All env vars are for the **release/publishing** tooling (see `.env.release.example`; copy values into the gitignored `.env.release` — never commit real credentials):

| Variable               | Purpose                                                                                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FIREFOX_EXTENSION_ID` | Must match the existing AMO add-on ID (GUID/email-style, not numeric). Also used as the `browser_specific_settings.gecko.id` fallback in `wxt.config.ts`. |
| `FIREFOX_JWT_ISSUER`   | AMO JWT issuer for Firefox submission (`scripts/upload.mjs`).                                                                                             |
| `FIREFOX_JWT_SECRET`   | AMO JWT secret for Firefox submission.                                                                                                                    |

There are **no runtime env vars** required by the extension itself.

## Common Development Tasks

- **Add/modify a search shortcut:** edit `src/integrations/poe-trade/filterDefinitions.ts` or `src/lib/searchShortcutDefinitions.ts`, then regenerate docs with `pnpm run docs:shortcuts` (validate with `pnpm run check:shortcuts-docs`).
- **Repair a website integration:** follow `docs/integrations.md` — capture a small sanitized example, add a regression test under `test/integrations/<provider>/fixtures/`, fix the adapter, then run `pnpm test`, `pnpm run typecheck`, and the relevant browser build. Also verify live behavior (fixtures can't reproduce every site/browser event).
- **Add a feature flag:** register the id in `src/stores/settings.ts` (`enhancerIds` or `searchEnhancementIds`) and gate the enhancer on `useSettingsStore`.
- **Release a version:** create/commit `changelogs/<version>.md` with a title and `## Added` / `## Changed` / `## Fixed` sections, bump `package.json`, then:

    ```bash
    pnpm run release -- patch       # local version commit + tag (minor/major also supported)
    pnpm run release -- patch -y    # also push branch + tag to origin
    ```

    The script validates the changelog and requires a clean tree. Git hooks (pre-commit on staged `package.json`, pre-push on `v*` tags) and the GitHub Actions workflow all re-run the checks, so validation cannot be bypassed. GitHub Actions tests, packages both browsers, and publishes the release; run `make upload-firefox` separately for AMO submission.

## Testing

- **Framework:** Vitest (`vitest.config.ts`), run with `pnpm test` (i.e. `vitest run`).
- **Layout:** tests mirror `src/` under `test/`. Sanitized markup and API response fixtures live beside integration tests at `test/integrations/<provider>/fixtures/` (e.g. `poe-trade`, `poe-ninja`).
- **Patterns:** integration tests assert against fixture HTML/JSON; feature/store/lib tests exercise the pure logic. When repairing an integration, always add a regression test that captures the failing case before fixing the adapter.

## Performance Considerations

- **Caching:** poe.ninja item prices are cached in `browser.storage.local` for 1 hour per category; concurrent requests are deduplicated via an in-flight `pending` map (`src/lib/prices/itemPrices.ts`).
- **Rate limiting:** after the first HTTP 429 from poe.ninja, further network requests are skipped and stale cache is reused.
- **Bounded state:** captured results are capped at 2000 items; item-capture messages are rejected above 500 KB.
- **Debouncing:** tab-title updates are debounced (~100 ms) and only run while the page has focus (`src/lib/pageController.ts`); Live Search discovery is throttled (15 s re-discovery, 20 s target staleness).
- **Async throughout:** all external I/O is `fetch`/runtime-message based; DOM work is synchronous with scheduled `setTimeout` batching to avoid layout thrash.
