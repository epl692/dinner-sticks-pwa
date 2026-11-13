/**
 * Which sync relay this device talks to. In priority order:
 *   1. a server the person chose in the app (Family screen / first-launch screen), kept on this device
 *   2. `config.json` next to the app, written at container start from RELAY_URL (no rebuild needed)
 *   3. VITE_SYNC_RELAY_URL, baked in at build time
 *   4. the default below
 * Everyone in a family must use the same relay (or one that holds the same data).
 */
export const DEFAULT_RELAY_URL = 'wss://relay.epl692.duckdns.org'

const STORAGE_KEY = 'dinner-sticks:relay-url'

export type RelaySource = 'chosen' | 'deployment' | 'build' | 'default'

let deploymentUrl: string | null = null

export type RelayParse = { ok: true; url: string } | { ok: false; error: string }

function isLocalHost(host: string): boolean {
  return (
    host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host.endsWith('.localhost')
  )
}

/**
 * Turns what a person typed into a WebSocket URL: accepts ws://, wss://, http(s):// (converted) or a bare
 * host name (assumed secure). An HTTPS page can only open wss:// connections, except to this machine.
 */
export function parseRelayUrl(
  input: string,
  pageIsHttps = globalThis.location?.protocol === 'https:',
): RelayParse {
  const text = input.trim()
  if (!text) return { ok: false, error: 'Enter the address of a sync server.' }
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) ? text : `wss://${text}`
  let url: URL
  try {
    url = new URL(withScheme)
  } catch {
    return { ok: false, error: "That doesn't look like a server address." }
  }
  if (url.protocol === 'http:') url.protocol = 'ws:'
  else if (url.protocol === 'https:') url.protocol = 'wss:'
  if (url.protocol !== 'ws:' && url.protocol !== 'wss:') {
    return {
      ok: false,
      error: 'Use an address starting with wss:// (or ws:// for a server on this network).',
    }
  }
  if (!url.hostname) return { ok: false, error: "That doesn't look like a server address." }
  if (url.protocol === 'ws:' && pageIsHttps && !isLocalHost(url.hostname)) {
    return {
      ok: false,
      error: 'This page is served over HTTPS, so the server address must start with wss://.',
    }
  }
  url.hash = ''
  const href = url.toString()
  // new URL() adds a trailing slash to a bare origin; keep addresses tidy and stable.
  return { ok: true, url: url.pathname === '/' && !url.search ? href.replace(/\/$/, '') : href }
}

function readChosen(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored && parseRelayUrl(stored).ok ? stored : null
  } catch {
    return null
  }
}

/** Reads `config.json` from the app's own origin. Missing, unreadable or offline just means "no deployment setting". */
export async function loadDeploymentConfig(): Promise<void> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}config.json`, { cache: 'no-store' })
    if (!res.ok) return
    const json: unknown = await res.json()
    const value = (json as { relayUrl?: unknown } | null)?.relayUrl
    if (typeof value === 'string') {
      const parsed = parseRelayUrl(value)
      deploymentUrl = parsed.ok ? parsed.url : null
    }
  } catch {
    // dev server, tests or offline: fall through to the build-time value or the default
  }
}

function buildUrl(): string | null {
  const configured: unknown = import.meta.env.VITE_SYNC_RELAY_URL
  if (typeof configured !== 'string' || !configured.trim()) return null
  const parsed = parseRelayUrl(configured)
  return parsed.ok ? parsed.url : null
}

export function getRelay(): { url: string; source: RelaySource } {
  const chosen = readChosen()
  if (chosen) return { url: chosen, source: 'chosen' }
  if (deploymentUrl) return { url: deploymentUrl, source: 'deployment' }
  const build = buildUrl()
  if (build) return { url: build, source: 'build' }
  return { url: DEFAULT_RELAY_URL, source: 'default' }
}

/** Remembers a chosen server on this device, or (with null) goes back to the deployment/build/default one. */
export function setChosenRelay(url: string | null): void {
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url)
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    throw new Error(
      "This browser won't let the app remember a server address (storage is blocked).",
    )
  }
}
