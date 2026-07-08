import { create } from 'zustand'
import { createStick, type Stick } from '../domain/entities/stick'
import { isNonEmptyName, isStickNameUnique } from '../domain/rules/nameUniqueness'
import * as stickRepository from '../data/repositories/stickRepository'

export type StickFieldError = 'empty' | 'duplicate'
export type StickActionResult = { ok: true } | { ok: false; error: StickFieldError }

interface SticksState {
  poolId: string | null
  sticks: Stick[]
  loadForPool: (poolId: string) => Promise<void>
  addStick: (name: string) => Promise<StickActionResult>
  renameStick: (id: string, name: string) => Promise<StickActionResult>
  deleteStick: (id: string) => Promise<void>
}

export const useSticksStore = create<SticksState>((set, get) => ({
  poolId: null,
  sticks: [],

  loadForPool: async (poolId) => {
    const sticks = await stickRepository.getSticksForPool(poolId)
    set({ poolId, sticks })
  },

  addStick: async (name) => {
    const { poolId, sticks } = get()
    if (!poolId || !isNonEmptyName(name)) return { ok: false, error: 'empty' }
    if (!isStickNameUnique(name, sticks)) return { ok: false, error: 'duplicate' }

    const stick = createStick(poolId, name)
    await stickRepository.addStick(stick)
    set((state) => ({ sticks: [...state.sticks, stick] }))
    return { ok: true }
  },

  renameStick: async (id, name) => {
    const { sticks } = get()
    if (!isNonEmptyName(name)) return { ok: false, error: 'empty' }
    if (!isStickNameUnique(name, sticks, id)) return { ok: false, error: 'duplicate' }

    const existing = sticks.find((s) => s.id === id)
    if (!existing) return { ok: false, error: 'duplicate' }

    const updated: Stick = { ...existing, name: name.trim() }
    await stickRepository.updateStick(updated)
    set((state) => ({ sticks: state.sticks.map((s) => (s.id === id ? updated : s)) }))
    return { ok: true }
  },

  deleteStick: async (id) => {
    await stickRepository.deleteStick(id)
    set((state) => ({ sticks: state.sticks.filter((s) => s.id !== id) }))
  },
}))
