import { create } from 'zustand'
import { createWeeklyBin, type WeeklyBin } from '../domain/entities/weeklyBin'
import type { Stick } from '../domain/entities/stick'
import { addStickToBin as addStickToBinRule, getAddCandidates as getAddCandidatesRule } from '../domain/rules/addToBin'
import { markStickDone } from '../domain/rules/markDone'
import { removeStickFromBin } from '../domain/rules/removeFromBin'
import {
  getReplaceCandidates as getReplaceCandidatesRule,
  replaceRandomCandidate,
  replaceWithChoice as replaceWithChoiceRule,
} from '../domain/rules/replace'
import * as weeklyBinRepository from '../data/repositories/weeklyBinRepository'
import { useSticksStore } from './useSticksStore'

interface BinState {
  poolId: string | null
  bin: WeeklyBin | null
  loadForPool: (poolId: string) => Promise<void>
  /** Confirms a draw (or a re-draw over an existing bin) as the pool's new bin (§4.2). */
  confirmDraw: (drawnStickIds: string[]) => Promise<void>
  markDone: (stickId: string) => Promise<void>
  removeStick: (stickId: string) => Promise<void>
  /** Returns false (no-op) when no replacement candidate is available (§4.4). */
  replaceRandom: (stickId: string) => Promise<boolean>
  replaceWithChoice: (stickId: string, chosenStickId: string) => Promise<void>
  /** Uncapped bin growth (§4.4a). */
  addStick: (stickId: string) => Promise<void>
  getReplaceCandidates: () => Stick[]
  getAddCandidates: () => Stick[]
}

export const useBinStore = create<BinState>((set, get) => ({
  poolId: null,
  bin: null,

  loadForPool: async (poolId) => {
    const bin = (await weeklyBinRepository.getBinForPool(poolId)) ?? null
    set({ poolId, bin })
  },

  confirmDraw: async (drawnStickIds) => {
    const { poolId } = get()
    if (!poolId) return
    const bin = createWeeklyBin(poolId, drawnStickIds)
    await weeklyBinRepository.replaceBinForPool(bin)
    set({ bin })
  },

  markDone: async (stickId) => {
    const { bin } = get()
    if (!bin) return
    const updated = markStickDone(bin, stickId)
    await weeklyBinRepository.upsertBin(updated)
    set({ bin: updated })
  },

  removeStick: async (stickId) => {
    const { bin } = get()
    if (!bin) return
    const updated = removeStickFromBin(bin, stickId)
    await weeklyBinRepository.upsertBin(updated)
    set({ bin: updated })
  },

  replaceRandom: async (stickId) => {
    const { bin } = get()
    if (!bin) return false
    const poolSticks = useSticksStore.getState().sticks
    const updated = replaceRandomCandidate(poolSticks, bin, stickId)
    if (!updated) return false
    await weeklyBinRepository.upsertBin(updated)
    set({ bin: updated })
    return true
  },

  replaceWithChoice: async (stickId, chosenStickId) => {
    const { bin } = get()
    if (!bin) return
    const updated = replaceWithChoiceRule(bin, stickId, chosenStickId)
    await weeklyBinRepository.upsertBin(updated)
    set({ bin: updated })
  },

  addStick: async (stickId) => {
    const { bin } = get()
    if (!bin) return
    const updated = addStickToBinRule(bin, stickId)
    await weeklyBinRepository.upsertBin(updated)
    set({ bin: updated })
  },

  getReplaceCandidates: () => {
    const { bin } = get()
    if (!bin) return []
    return getReplaceCandidatesRule(useSticksStore.getState().sticks, bin)
  },

  getAddCandidates: () => {
    const { bin } = get()
    if (!bin) return []
    return getAddCandidatesRule(useSticksStore.getState().sticks, bin)
  },
}))
