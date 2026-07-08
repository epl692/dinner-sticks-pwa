import { create } from 'zustand'
import {
  createSelectionSession,
  MAX_DRAW_SIZE,
  type SelectionSession,
} from '../domain/entities/selectionSession'
import { discardAndRedraw, randomDraw } from '../domain/rules/draw'
import { useSticksStore } from './useSticksStore'

export type StartDrawResult = { ok: true } | { ok: false; error: 'empty_pool' }

/**
 * In-memory only — no repository calls anywhere in this store. If the app closes
 * or crashes mid-draw, this state simply vanishes and the previous bin (if any)
 * is left completely untouched (§3, §7).
 *
 * Deliberately has no drawnSticks()/hasEligibleRemaining() derived-data methods:
 * calling those through a store selector would return a fresh array/value every
 * call and break React's useSyncExternalStore snapshot-caching contract. Callers
 * should subscribe to `session` and the pool's `sticks` directly and compute
 * derived values in the render body instead.
 */
interface SelectionSessionState {
  session: SelectionSession | null
  reducedCount: number | null
  start: (poolId: string) => StartDrawResult
  discard: (stickId: string) => void
  end: () => void
}

export const useSelectionSessionStore = create<SelectionSessionState>((set, get) => ({
  session: null,
  reducedCount: null,

  start: (poolId) => {
    const poolSticks = useSticksStore.getState().sticks
    if (poolSticks.length === 0) {
      return { ok: false, error: 'empty_pool' }
    }

    const drawn = randomDraw(poolSticks)
    const session: SelectionSession = {
      ...createSelectionSession(poolId),
      drawnStickIds: drawn.map((s) => s.id),
    }
    set({
      session,
      reducedCount: poolSticks.length < MAX_DRAW_SIZE ? poolSticks.length : null,
    })
    return { ok: true }
  },

  discard: (stickId) => {
    const { session } = get()
    if (!session) return
    const poolSticks = useSticksStore.getState().sticks
    set({ session: discardAndRedraw(session, poolSticks, stickId) })
  },

  end: () => set({ session: null, reducedCount: null }),
}))
