import { createIndexedDbStorage, type SyncCore } from '@sync/core'
import { createInviteProvider } from '@sync/identity-invite'
import { assertSecureCore, openSecureCore, type JoinRequestView, type Spaces } from '@sync/spaces'
import { createWebSocketTransport } from '@sync/transport-websocket'

/**
 * The sync relay every device of every family connects to. It only ever sees encrypted, signed
 * packets, so one relay can serve any number of unrelated apps and families. Override at build
 * time with VITE_SYNC_RELAY_URL (for example for a relay of your own).
 */
export const DEFAULT_RELAY_URL = 'wss://sync.epl692.duckdns.org'

export function relayUrl(): string {
  const configured = import.meta.env.VITE_SYNC_RELAY_URL
  return typeof configured === 'string' && configured.trim() ? configured.trim() : DEFAULT_RELAY_URL
}

export interface SyncSession {
  core: SyncCore
  spaces: Spaces
}

export interface OpenSyncOptions {
  /** Called when someone presents an invite this device created; resolve true to let them in. */
  approveJoin: (req: JoinRequestView) => Promise<boolean>
}

/**
 * Opens this device's encrypted local store and connects it to the relay. Nothing here needs the
 * network: with no connection the app works from the local copy and catches up when it returns.
 */
export async function openSync(opts: OpenSyncOptions): Promise<SyncSession> {
  const storage = await createIndexedDbStorage({ name: 'dinner-sticks-sync' })
  await storage.persist?.()

  const { core, spaces } = await openSecureCore({
    provider: createInviteProvider({
      // Invite links point back at this app; the secret travels in the #fragment, which browsers never send to a server.
      baseUrl: `${location.origin}${location.pathname}`,
    }),
    keyDb: 'dinner-sticks-keys',
    approveJoin: opts.approveJoin,
    core: { storage },
  })

  if (spaces.state === 'ready') {
    assertSecureCore(core)
    core.addTransport(createWebSocketTransport({ url: relayUrl() }))
  }
  return { core, spaces }
}
