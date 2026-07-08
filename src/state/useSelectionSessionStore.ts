import { create } from 'zustand'
import {
  createSelectionSession,
  MAX_DRAW_SIZE,
  type SelectionSession,
} from '../domain/entities/selectionSession'
import type { Stick } from '../domain/entities/stick'
import { discardAndRedraw, randomDraw } from '../domain/rules/draw'
import { useSticksStore } from './useSticksStore'

export type StartDrawResult = { ok: true } | { ok: false; error: 'empty_pool' }

/**
 * In-memory only — no repository calls anywhere in this store. If the app closes
 * or crashes mid-draw, this state simply vanishes and the previous bin (if any)
 * is left completely untouched (§3, §7).
 */
interface SelectionSessionState {
  session: SelectionSession | null
  reducedCount: number | null
  start: (poolId: string) => StartDrawResult
  discard: (stickId: string) => void
  end: () => void
  drawnSticks: () => Stick[]
  hasEligibleRemaining: () => boolean
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

  drawnSticks: () => {
    const { session } = get()
    if (!session) return []
    const byId = new Map(useSticksStore.getState().sticks.map((s) => [s.id, s]))
    return session.drawnStickIds.map((id) => byId.get(id)).filter((s): s is Stick => s !== undefined)
  },

  hasEligibleRemaining: () => {
    const { session } = get()
    if (!session) return false
    const ineligible = new Set([...session.drawnStickIds, ...session.discardedStickIds])
    return useSticksStore.getState().sticks.some((s) => !ineligible.has(s.id))
  },
}))
