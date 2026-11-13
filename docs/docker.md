# Running Dinner Sticks with Docker

Two containers: the **relay** (the sync server; stores and forwards encrypted data, can't read it) and the **app** (the website, served by nginx). You don't need your own relay — the app works with the default one — but this is how to run both yourself.

> The compose and entrypoint files here were validated (`docker compose config`, the config script run by hand) but the images were **not built** in the environment they were written in, which had no Docker daemon. If a build step fails, please open an issue with the output.

## Quick start (this machine only)

```bash
cp .env.example .env        # optional; defaults work
docker compose up --build
```

- App: <http://localhost:8080>
- Relay: `ws://localhost:8787`

`localhost` counts as a secure context, so the service worker, offline mode and installation work on the machine running Docker. To try the family flow, open the app in two different browsers (or one normal and one private window) and invite from one to the other.

## Using it from phones and other computers

Other devices can't use `localhost`, and browsers only allow installing a PWA — and only let an HTTPS page open a WebSocket — over **HTTPS** (`wss://`). Two options:

### A. Automatic HTTPS with the bundled Caddy (recommended)

You need a domain whose DNS points at this machine, and ports 80 and 443 reachable.

```bash
# .env
DOMAIN=dinner.example.com
RELAY_URL=wss://dinner.example.com/sync

docker compose --profile https up -d --build
```

Caddy gets a certificate, serves the app at `https://dinner.example.com` and the relay at `wss://dinner.example.com/sync`. (A free `*.duckdns.org` name works.) With this profile you can stop publishing the plain ports: leave `APP_PORT`/`RELAY_PORT` alone if you don't mind them, or remove the `ports:` entries in `docker-compose.yml`.

### B. Your own reverse proxy / tunnel

Run `docker compose up -d --build`, then proxy HTTPS to port 8080 (app) and WSS to port 8787 (relay) with whatever you use (nginx, Traefik, Cloudflare Tunnel, Tailscale Funnel…), and set `RELAY_URL` to the public `wss://` address.

### Plain HTTP on a home network (no install)

`RELAY_URL=ws://192.168.1.20:8787` and open `http://192.168.1.20:8080` works for basic use, but browsers won't offer installation or offline support on a non-HTTPS address other than `localhost`.

## Configuration

All set in `.env` (see `.env.example`):

| Variable                 | Meaning                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RELAY_URL`              | Sync server address handed to browsers when the app container starts. Must be reachable **from the devices using the app**. Unset = the app's built-in default. |
| `APP_PORT`, `RELAY_PORT` | Host ports (8080, 8787).                                                                                                                                        |
| `SYNC_REF`               | Branch, tag or commit of the [Sync PWA Framework](https://github.com/epl692/Sync-PWA-Framework) the relay is built from. Pin a commit for reproducible builds.  |
| `DOMAIN`                 | Only for `--profile https`.                                                                                                                                     |

`RELAY_URL` is written to `/config.json` each time the app container starts, so **changing it needs only `docker compose up -d`** (a restart of `app`), not a rebuild.

## Changing the sync server later

There are four layers, highest priority first. Whichever is in effect is shown, with where it came from, under **Sync server** on the first-launch screen and the Family screen.

1. **In the app, per device.** Open **Sync server**, type the new address, **Use this server**. It takes effect immediately and is remembered on that device. **Go back to the default** removes it. Local data is untouched.
2. **Container start:** `RELAY_URL` (above). Applies to everyone using that deployment who hasn't chosen their own.
3. **Build time:** `VITE_SYNC_RELAY_URL=wss://… npm run build`.
4. **Built-in default:** `wss://relay.epl692.duckdns.org`.

**Everyone in a family must end up on the same relay.** When you move a family to a new relay, each person switches (or gets the new deployment); every device already holds the family's data and pushes it to the new relay, so nothing is lost as long as at least one device that has the data connects. A device that was offline for a long time catches up from the others.

## Things to know about the relay

- It keeps data **in memory**. After a restart devices simply send it again, so no volume is needed, but a fresh relay is empty until a device with the data reconnects. The data lives on the family's devices, not on the relay — treat the relay as a post office, not a vault.
- It only sees encrypted, signed packets. Sharing one relay between several apps and unrelated families is fine.
- Anyone who knows its address can connect and store/forward ciphertext (there is no login). Exposing it publicly is therefore a resource-use question, not a privacy one; put limits on it at your proxy if that matters to you.

## Development without Docker

```bash
npm install && npm run dev                                  # the app
(cd ../Sync-PWA-Framework && npm install && npm run relay-server)   # a relay on ws://localhost:8787
```

then set the server to `ws://localhost:8787` in the app (or `VITE_SYNC_RELAY_URL=ws://localhost:8787 npm run dev`).
