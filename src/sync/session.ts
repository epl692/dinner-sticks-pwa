import { createIndexedDbStorage, type SyncCore } from '@sync/core'
import { createInviteProvider } from '@sync/identity-invite'
import { assertSecureCore, openSecureCore, type JoinRequestView, type Spaces } from '@sync/spaces'
import { createWebSocketTransport } from '@sync/transport-websocket'
import { getRelay } from './relayConfig'

export interface SyncSession {
  core: SyncCore
  spaces: Spaces
  /** Points this device at another relay (or the same one again). The local data is untouched. */
  switchRelay: (url: string) => Promise<void>
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

  const TRANSPORT_ID = 'websocket'
  const switchRelay = async (url: string) => {
    if (spaces.state !== 'ready') return
    if (core.transports().some((t) => t.id === TRANSPORT_ID))
      await core.removeTransport(TRANSPORT_ID)
    core.addTransport(createWebSocketTransport({ url, id: TRANSPORT_ID }))
  }

  if (spaces.state === 'ready') {
    assertSecureCore(core)
    await switchRelay(getRelay().url)
  }
  return { core, spaces, switchRelay }
}
