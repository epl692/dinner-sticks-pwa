# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then production-build (includes the PWA service worker/manifest via `vite-plugin-pwa`)
- `npm run preview` — serve the production build locally
- `npm run test` — run the Vitest suite once (`npm run test:watch` for watch mode)
- `npm run lint` — run oxlint
- `npm run format` — run Prettier across the repo

Run a single test file with `npx vitest run path/to/file.test.ts` (or `.tsx`), or filter by name with `npx vitest run -t "pattern"`.

## Purpose of the design document

[dinner-sticks-pwa-design.md](dinner-sticks-pwa-design.md) is the **platform-agnostic product spec** — the source of truth for required behavior. It describes _what_ the app must do (concepts, data, rules, screens, a11y, performance), not how to build it. Read it before making behavioral changes; sections cross-reference each other (§6 "Business Rules & Algorithms" restates rules from §3/§4 in precise, implementation-checkable form).

The doc has already been amended three times from its original form to add features the original app never had: **Add a stick to an already-confirmed bin** (§4.4a — uncapped growth, distinct from Replace/Remove), **JSON import/export of the meal library** (§4.6 — Pools+Sticks only, import is a full destructive replace, now family-wide), and **family sync** (§4.7 — account-free, end-to-end encrypted sharing through the Sync PWA Framework; this reversed the original "no sync" non-goal).

## Architecture

Four layers, each with zero knowledge of the layers above it:

1. **`src/domain/`** — pure business logic, no React/Dexie/browser API dependency. `entities/` holds the four core types (Pool, Stick, WeeklyBin, SelectionSession — see §2–§3 of the design doc); `rules/` holds one function-set per §6 business rule (draw, replace, addToBin, markDone, removeFromBin, poolLifecycle, nameUniqueness, staleReferences); `io/` holds import/export serialization+validation. This is the layer flagged in the design doc as needing _precise_ reproduction — it carries the heaviest test coverage.
2. **`src/data/`** — repositories over the **Sync PWA Framework** (`@sync/core`). Pools, sticks and bins are objects in one shared family Space (types `dinner.pool`, `dinner.stick`, `dinner.bin`, `dinner.binItem`, in `src/sync/dataContext.ts`); the object id **is** the domain UUID. Repository function signatures are the same as when this layer was Dexie, so stores and domain code didn't change. Reads use `core.query(...).once()` and writes author packets that sync to other devices. Things that differ from a single-device database and are easy to get wrong:
   - **A bin is stored as a `dinner.bin` object plus one `dinner.binItem` per stick** (`status` active/done, fractional `pos` for order), _not_ as two array fields. That is what lets two people edit the same week at once without losing each other's changes. `weeklyBinRepository.upsertBin` diffs the domain `WeeklyBin` against stored items. If two bins exist for one pool (concurrent re-draws), the newest `createdAt` wins and `replaceBinForPool` deletes the rest.
   - **Storage cannot enforce name uniqueness or multi-object transactions.** Uniqueness is only enforced by the domain rules before a write; same-named pools/sticks made on two offline devices both survive. `replaceLibrary` is a sequence of writes, not an atomic transaction (validation happens before it, in `useImportExportStore`).
   - **A deleted object id can never be recreated.** Always create with fresh ids (`createPool`/`createStick`/`buildReplacePlan` already do).
   - `src/data/legacy/legacyDb.ts` is the _old_ Dexie database, read-only, used only for the one-time upload of pre-sync data (`planLegacyMerge` in `domain/io`, applied by `state/legacyMigration.ts`). Never write to it or delete it; it is the user's backup.
3. **`src/state/`** (and **`src/sync/`**) — Zustand stores wiring domain+data to UI. `src/sync/session.ts` opens the encrypted core and the WebSocket transport (relay URL resolved by `src/sync/relayConfig.ts`: in-app choice in localStorage > `/config.json` written by the app container from `RELAY_URL` > `VITE_SYNC_RELAY_URL` > built-in default; changeable at runtime via `useFamilyStore.changeRelay` and the `RelaySettings` component); `useFamilyStore` owns identity, membership, invites, join approval and link status. `App.tsx` subscribes to `watchLibrary` so remote changes reload the pools store. Pattern: action → domain function (pure) → repository call (persist + sync) → store update. `useSelectionSessionStore` is the exception — it's in-memory only, no repository calls, because the design doc requires the in-progress draw session to _never_ be persisted (§3, §7).
4. **`src/presentation/`** — React screens/components implementing §5's five screens/patterns (Home, Weekly Draw, Pool Management, Pool Switcher, shared Stick Editor form). Navigation is a hand-rolled push/pop stack (`navigation/NavigationStack.tsx`), not a router — the design doc explicitly rules out deep linking.

**Stick deletion never cascades**: a bin can hold a stale reference to a deleted stick. Stale references are filtered out of _displayed_ bin contents on read, never proactively cleaned up, and never eligible for future draws/replacements/adds. Don't implement this as cascading deletes.

**Name uniqueness has two different scopes**: pool names are unique case-insensitively _across all pools_; stick names are unique case-insensitively _within their own pool only_.

## Key algorithms to reproduce exactly (§6)

1. Random draw: uniform, without replacement, capped at 5 (or fewer if pool has <5 sticks) — this cap applies only to the initial draw.
2. Discard → redraw: discarding permanently excludes that stick from the rest of the _session_ and immediately draws one replacement from what's left, if anything remains.
3. Replace-after-confirmation: "Random" draws uniformly from pool sticks _not currently in the bin_; "Pick one" lets the user choose from that same candidate list.
4. Add-to-bin (§4.4a): same not-in-bin candidate list as Replace; appends without removing anything; **not** subject to the 5-cap, since that only bounds the original draw.
5. Mark done: idempotent — always ends with the stick in `doneStickIds` and out of `activeStickIds`, regardless of prior state.
6. Last-pool safeguard: deleting the only remaining pool creates a fresh empty "Dinner" pool as part of the same operation.
7. Import replace (§4.6): all-or-nothing — full validation (shape, ≥1 pool, no duplicate names) before anything is applied; on success every pool/stick/bin in the instance is replaced/cleared in one operation; on failure nothing changes.

## Non-goals (§10)

Do not add scope beyond the design doc without asking: no cloud backend that can read data, no per-person accounts/passwords (family sync via invite links is in scope, §4.7), no fine-grained per-pool sharing, no notifications/reminders/scheduling, no configurable draw size (draw itself always ≤5, though the bin can grow past 5 via Add), no deep linking (except opening an invite link). §11's PWA-native opportunities (installability, offline indicator, responsive layout) have been adopted as real requirements for this rebuild given the explicit cross-platform goal — they are not merely optional here.

## Accessibility (§8)

Target WCAG 2.1 AA. 48×48 minimum touch targets, state never conveyed by color alone, confirmation steps required before destructive actions (delete stick, delete pool, remove bin stick, import-replace), and the specific accessible-name strings in the §8 table must be preserved literally (e.g. "Pick a random meal from this week's plan", "Add a meal to this week's plan", "Import meal library from a file — replaces all current pools and meal ideas"). `ConfirmDialog` and the other modals use the native `<dialog>` element specifically for its built-in focus trap and focus-return behavior — don't replace it with a hand-rolled overlay.

## Gotchas worth knowing before touching this codebase

- **Never call a store method that computes derived data (returns a new array/object each call) through a Zustand selector** — e.g. `useBinStore((s) => s.someComputedThing())`. This crashed a real component during development ("The result of getSnapshot should be cached to avoid an infinite loop") because it breaks React's `useSyncExternalStore` snapshot-caching contract. Instead, subscribe to the raw state (`bin`, `sticks`, `session`) and compute derived values in the render body using the pure domain functions directly — see `AddStickToBinDialog.tsx`, `ReplacePickOneDialog.tsx`, or `WeeklyDrawScreen.tsx` for the pattern. None of the stores expose derived-data getters for exactly this reason.
- **jsdom doesn't implement `HTMLDialogElement.showModal()`/`close()`** — `src/test/setupTests.ts` polyfills them just enough (toggling the `open` attribute) so dialog-containing components are testable at all under Vitest. Real modal/focus-trap behavior has only been verified manually in an actual browser, not asserted by any test.
- **`vitest-axe`'s shipped type declarations target an older Vitest typing convention** and don't merge with this project's Vitest 4. The a11y tests assert on `(await axe(container)).violations` directly (an empty array) rather than using the `toHaveNoViolations()` custom matcher — don't add `expect.extend` for it back in without confirming the type error is actually resolved.
- **The PWA icon set in `public/icons/`, `public/favicon.ico`, and `public/apple-touch-icon.png` is a 🌮 taco emoji on a solid purple (`#5B21B6`) background**, matching the in-app `--color-accent`. `DinnerSticksIcon.png` at the repo root is the 1024×1024 master. It was produced by rendering the emoji via headless Chromium (Noto Color Emoji font) onto a purple canvas, then auto-cropping/recentering the glyph with Pillow so it sits consistently within the maskable safe zone — no separate maskable-flattening step is needed since the background is already fully opaque. All output sizes (`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon.ico`, `apple-touch-icon.png`) were then resized directly from the master. Regenerate by re-running the same render-crop-resize steps against the master if the icon design changes again; there's no npm tooling dependency to reinstall for this since it was done directly with Pillow.
- **The service worker only registers in a production build**, not `npm run dev`. To verify installability/offline behavior for real, use `npm run build && npm run preview` (or the `dinner-sticks-preview` launch config) and check `navigator.serviceWorker.getRegistrations()` / the Cache Storage contents, not the dev server.
- **The sync framework is a git dependency shipped as TypeScript source** (`sync-pwa-framework`, pinned by `package-lock.json`). Vite aliases `@sync/*` to its source (`vite.config.ts`); type-checking uses declarations generated by `scripts/sync-types.mjs` into `.sync-types/` (git-ignored, regenerated on `postinstall` and `npm run build`) because the framework's source doesn't compile under this repo's stricter tsconfig. If `tsc` says `@sync/...` has no exported member, run `npm run sync-types`.
- **Tests run against an in-memory, _plaintext_ core** (`src/test/testData.ts`, installed before every test by `setupTests.ts`), not the encrypting one — never import `src/test/*` from app code. `src/test/linkedTransports.ts` wires two cores together to test two-device merges (`data/__tests__/familySync.test.ts`). The real encrypted join/sync flow was verified end to end only manually, with Playwright against the framework's `npm run relay-server`; there is no automated test of it.
- **Production code must only use `openSecureCore`** (it registers the encrypting codec; `assertSecureCore` runs at startup). Don't create a core with a plaintext codec outside tests.
- **Docker** (`docker-compose.yml`, `docker/`, `docs/docker.md`): relay container built from the framework repo, app container = nginx serving `dist/`, with `RELAY_URL` written to `/config.json` at container start (never baked into the image; `config.json` and `sw.js` must stay uncached — see `docker/app/nginx.conf`). The images have not been built in CI or the authoring sandbox (no Docker daemon).
