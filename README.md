# Dinner Sticks

A installable web app for picking what's for dinner. Add meal ideas to a pool, draw a random weekly plan (up to 5 at a time), swap or add to it as the week goes, and mark meals done as you cook them.

It's an offline-first Progressive Web App that your whole family can share. Every device keeps a full local copy (IndexedDB), so it works offline once installed, and changes sync between family members' devices through a relay server. There are no accounts or passwords: you start a family, then invite others with a link or QR code. Everything is end-to-end encrypted, so the relay only sees ciphertext. Syncing is built on the [Sync PWA Framework](https://github.com/epl692/Sync-PWA-Framework).

See [dinner-sticks-pwa-design.md](dinner-sticks-pwa-design.md) for the full product spec, and [CLAUDE.md](CLAUDE.md) for architecture notes if you're developing on this codebase.

## Tech stack

- React 19 + TypeScript, built with Vite
- Zustand for state; [Sync PWA Framework](https://github.com/epl692/Sync-PWA-Framework) (`@sync/core`, `@sync/spaces`, `@sync/identity-invite`, `@sync/transport-websocket`) for local-first storage, end-to-end encryption and sync
- Dexie is kept only to read the pre-sync on-device library for the one-time upload
- `vite-plugin-pwa` for the service worker + web app manifest
- Vitest + Testing Library for tests

## Sync server

By default the app connects to the relay at `wss://sync.epl692.duckdns.org`. The relay stores and forwards encrypted packets and never holds keys, so one relay can serve this app, other apps built on the framework, and any number of unrelated families. To use a different one, set it at build time:

```bash
VITE_SYNC_RELAY_URL=wss://your-relay.example npm run build
```

To run a relay of your own (Node 20+): clone the framework repo, `npm install`, then `npm run relay-server` (listens on `ws://localhost:8787`; put it behind HTTPS/WSS for real use, since a page served over HTTPS can only open `wss://` connections).

The framework is installed as a git dependency (`sync-pwa-framework`) and consumed as TypeScript source. `npm install` runs `scripts/sync-types.mjs`, which generates declaration files into `.sync-types/` (git-ignored) so the app type-checks against them; `npm run build` re-runs it.

## Local development

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

This starts the Vite dev server (default `http://localhost:5173`). Note: the service worker only registers in a production build, not in `npm run dev` — see below to test offline/installable behavior.

Other commands:

```bash
npm run build          # type-check, then produce a production build in dist/
npm run preview        # serve the production build locally
npm run test           # run the test suite once
npm run test:watch     # run tests in watch mode
npm run lint           # oxlint
npm run format         # Prettier
```

## Installing it into your website

"Installing" this app means deploying the static, prebuilt output (`dist/`) somewhere it can be served over HTTPS — there's no server-side component to run. Once deployed, visitors can "install" it to their device (Add to Home Screen / install icon in the browser address bar) like any PWA.

### 1. Build it

```bash
npm install
npm run build
```

This produces a self-contained `dist/` folder: HTML, JS, CSS, icons, the web app manifest, and the service worker. Everything inside `dist/` is what you deploy — nothing else from this repo needs to go on the server.

### 2. Decide where it lives on your site

**At your domain root** (e.g. `dinnersticks.example.com`, or a dedicated subdomain): no changes needed. Upload the contents of `dist/` to your web root and it works as-is.

**Under a subpath of an existing site** (e.g. `example.com/dinner-sticks/`): you need to tell Vite about that path before building, so asset URLs, the manifest, and the service worker scope all resolve correctly:

1. In [vite.config.ts](vite.config.ts), add a `base` option:
   ```ts
   export default defineConfig({
     base: '/dinner-sticks/',
     // ...existing config
   })
   ```
2. In that same file, update the PWA manifest's `start_url` to match:
   ```ts
   manifest: {
     // ...
     start_url: '/dinner-sticks/',
   }
   ```
3. Rebuild (`npm run build`) and upload `dist/`'s contents into `example.com/dinner-sticks/` on your server.

### 3. Upload and serve

Copy everything under `dist/` to your host (FTP/SFTP, your host's file manager, or a `git push`/CI step, depending on how your site is deployed). Requirements:

- **HTTPS** — service workers (and therefore installability + offline support) only work over HTTPS, or on `localhost`.
- **Static file hosting is enough** — no server-side rendering, database, or API needed. Any static host (Apache, Nginx, Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3+CloudFront, etc.) works.
- **No URL rewriting needed** — this app has no client-side router or deep links (by design), so you don't need SPA fallback rules pointing every path back to `index.html`.
- Serve the files as-is with their existing names/paths; don't rename or move `manifest.webmanifest`, the generated service worker file, or anything under `icons/` relative to `index.html`, since the manifest and service worker reference them by path.

### 4. Verify

Visit the deployed URL in a browser, confirm the app loads, and check that an "install" prompt/icon appears (address bar on desktop Chrome/Edge, "Add to Home Screen" on mobile). Reload with the network disabled to confirm offline support is working.

## Project structure

```
src/
  domain/        pure business logic (entities, rules, import/export) — no framework deps
  data/           Dexie (IndexedDB) schema and repositories
  state/          Zustand stores wiring domain + data to the UI
  presentation/   React screens and components
```
