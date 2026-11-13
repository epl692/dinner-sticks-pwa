import { create } from 'zustand'
import type { InviteArtifact, JoinRequestView, MemberInfo, Role } from '@sync/spaces'
import { seedIfEmpty } from '../data/seed'
import {
  getRelay,
  loadDeploymentConfig,
  parseRelayUrl,
  setChosenRelay,
  type RelaySource,
} from '../sync/relayConfig'
import { openSync, type SyncSession } from '../sync/session'
import { setDataContext } from '../sync/dataContext'

/**
 * "The family" is the one shared encrypted Space that holds every pool, stick and weekly plan.
 * This store owns this device's identity in it, who else is in it, and the connection to the relay.
 * There are no accounts: a person is a name plus a key pair made on first launch, and people join
 * by invite link or QR code.
 */

export type FamilyPhase = 'starting' | 'setup' | 'ready' | 'unsupported' | 'error'
export type LinkState = 'offline' | 'connecting' | 'online'

export interface PendingJoin {
  request: JoinRequestView
  decide: (allow: boolean) => void
}

export interface JoinProgress {
  status: 'idle' | 'waiting' | 'failed'
  /** The five words the family owner will also see (a guard against a copied invite). */
  sas: string | null
  error: string | null
}

const INVITE_DAYS = 7
const JOIN_WAIT_MS = 5 * 60 * 1000
export const JOIN_PREFIX = '#/join/'

interface FamilyState {
  phase: FamilyPhase
  error: string | null
  session: SyncSession | null
  userId: string | null
  displayName: string | null
  familyName: string | null
  spaceId: string | null
  myRole: Role | null
  members: MemberInfo[]
  link: LinkState
  pendingJoin: PendingJoin | null
  join: JoinProgress
  invite: InviteArtifact | null
  /** The sync server this device uses, and where that choice came from. */
  relay: { url: string; source: RelaySource }
  /** Switches server (or, with null, back to the deployment/default one). Local data is untouched. */
  changeRelay: (input: string | null) => Promise<{ ok: true } | { ok: false; error: string }>
  /** An invite link the app was opened with, to prefill the join form. */
  incomingInvite: string | null

  start: () => Promise<void>
  createFamily: (displayName: string, familyName: string) => Promise<void>
  joinFamily: (displayName: string, inviteText: string) => Promise<void>
  createInvite: () => Promise<void>
  refreshMembers: () => Promise<void>
  removeMember: (userId: string) => Promise<void>
  makeOwner: (userId: string) => Promise<void>
  leaveFamily: () => Promise<void>
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/** Reads an invite link the app was opened with, and clears it from the address bar. */
function takeIncomingInvite(): string | null {
  if (typeof location === 'undefined' || !location.hash.startsWith(JOIN_PREFIX)) return null
  const link = location.href
  try {
    history.replaceState(null, '', location.pathname + location.search)
  } catch {
    // not fatal: the fragment just stays in the address bar
  }
  return link
}

let starting: Promise<void> | null = null

export const useFamilyStore = create<FamilyState>((set, get) => {
  function watchLink(session: SyncSession) {
    const update = () => {
      const states = session.core.transports().map((t) => t.state)
      const link: LinkState = states.includes('ready')
        ? 'online'
        : states.includes('connecting')
          ? 'connecting'
          : 'offline'
      if (get().link !== link) set({ link })
    }
    update()
    session.core.on((e) => {
      if (e.kind === 'transport:state') update()
    })
    session.spaces.on((e) => {
      if (e.kind === 'member:changed') void get().refreshMembers()
    })
  }

  async function enterFamily(session: SyncSession, spaceId: string) {
    setDataContext({ core: session.core, space: spaceId })
    const info = (await session.spaces.list()).find((s) => s.id === spaceId)
    const user = session.spaces.session()
    set({
      phase: 'ready',
      spaceId,
      familyName: info?.name ?? 'Family',
      myRole: info?.myRole ?? null,
      userId: user?.user ?? null,
      displayName: user?.displayName ?? null,
      invite: null,
      join: { status: 'idle', sas: null, error: null },
    })
    await get().refreshMembers()
  }

  function approveJoin(request: JoinRequestView): Promise<boolean> {
    return new Promise((resolve) => {
      // One at a time: a second request while one is showing is declined rather than silently replacing it.
      if (get().pendingJoin) return resolve(false)
      set({
        pendingJoin: {
          request,
          decide: (allow) => {
            set({ pendingJoin: null })
            resolve(allow)
          },
        },
      })
    })
  }

  return {
    phase: 'starting',
    error: null,
    session: null,
    userId: null,
    displayName: null,
    familyName: null,
    spaceId: null,
    myRole: null,
    members: [],
    link: 'offline',
    pendingJoin: null,
    join: { status: 'idle', sas: null, error: null },
    invite: null,
    incomingInvite: null,
    relay: getRelay(),

    changeRelay: async (input) => {
      const { session } = get()
      let url: string | null = null
      if (input !== null) {
        const parsed = parseRelayUrl(input)
        if (!parsed.ok) return parsed
        url = parsed.url
      }
      try {
        setChosenRelay(url)
        const relay = getRelay()
        await session?.switchRelay(relay.url)
        set({ relay, link: 'connecting' })
        return { ok: true }
      } catch (err) {
        return { ok: false, error: message(err) }
      }
    },

    start: () => {
      // React StrictMode runs effects twice in development; only open the stores once.
      starting ??= (async () => {
        try {
          set({ incomingInvite: takeIncomingInvite() })
          await loadDeploymentConfig()
          set({ relay: getRelay() })
          const session = await openSync({ approveJoin })
          if (session.spaces.state === 'unsupported') {
            set({ phase: 'unsupported', session })
            return
          }
          set({ session })
          watchLink(session)
          const family = (await session.spaces.list())[0]
          if (session.spaces.session() && family) {
            await enterFamily(session, family.id)
          } else {
            set({ phase: 'setup', displayName: session.spaces.session()?.displayName ?? null })
          }
        } catch (err) {
          set({ phase: 'error', error: message(err) })
        }
      })()
      return starting
    },

    createFamily: async (displayName, familyName) => {
      const { session } = get()
      if (!session) return
      if (!session.spaces.session()) await session.spaces.signUp(displayName.trim())
      const space = await session.spaces.create(familyName.trim())
      setDataContext({ core: session.core, space: space.id })
      await seedIfEmpty()
      await enterFamily(session, space.id)
    },

    joinFamily: async (displayName, inviteText) => {
      const { session } = get()
      if (!session) return
      set({ join: { status: 'waiting', sas: null, error: null } })
      try {
        if (!session.spaces.session()) await session.spaces.signUp(displayName.trim())
        const { space } = await session.spaces.accept(inviteText.trim(), {
          timeoutMs: JOIN_WAIT_MS,
          onSas: (sas) => set((s) => ({ join: { ...s.join, sas } })),
        })
        await enterFamily(session, space)
      } catch (err) {
        set((s) => ({ join: { status: 'failed', sas: s.join.sas, error: message(err) } }))
      }
    },

    createInvite: async () => {
      const { session, spaceId } = get()
      if (!session || !spaceId) return
      const invite = await session.spaces.invite(spaceId, {
        role: 'editor',
        expiresAt: Date.now() + INVITE_DAYS * 24 * 60 * 60 * 1000,
        maxUses: 1,
        approval: 'required',
      })
      set({ invite })
    },

    refreshMembers: async () => {
      const { session, spaceId } = get()
      if (!session || !spaceId) return
      const [members, info] = await Promise.all([
        session.spaces.members(spaceId),
        session.spaces.list().then((l) => l.find((s) => s.id === spaceId)),
      ])
      set({
        members,
        myRole: info?.myRole ?? get().myRole,
        familyName: info?.name ?? get().familyName,
      })
    },

    removeMember: async (userId) => {
      const { session, spaceId } = get()
      if (!session || !spaceId) return
      await session.spaces.remove(spaceId, userId)
      await get().refreshMembers()
    },

    makeOwner: async (userId) => {
      const { session, spaceId } = get()
      if (!session || !spaceId) return
      await session.spaces.setRole(spaceId, userId, 'owner')
      await get().refreshMembers()
    },

    leaveFamily: async () => {
      const { session, spaceId } = get()
      if (!session || !spaceId) return
      await session.spaces.leave(spaceId)
      setDataContext(null)
      set({
        phase: 'setup',
        spaceId: null,
        familyName: null,
        myRole: null,
        members: [],
        invite: null,
        join: { status: 'idle', sas: null, error: null },
      })
    },
  }
})
