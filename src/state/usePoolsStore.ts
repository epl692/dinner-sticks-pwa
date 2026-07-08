import { create } from 'zustand'
import { createPool, type Pool } from '../domain/entities/pool'
import { isNonEmptyName, isPoolNameUnique } from '../domain/rules/nameUniqueness'
import { deletePoolWithSafeguard } from '../domain/rules/poolLifecycle'
import * as poolRepository from '../data/repositories/poolRepository'
import * as stickRepository from '../data/repositories/stickRepository'
import * as weeklyBinRepository from '../data/repositories/weeklyBinRepository'
import { useSticksStore } from './useSticksStore'
import { useBinStore } from './useBinStore'

export type PoolFieldError = 'empty' | 'duplicate'
export type PoolActionResult = { ok: true } | { ok: false; error: PoolFieldError }

interface PoolsState {
  pools: Pool[]
  activePoolId: string | null
  loaded: boolean
  loadPools: () => Promise<void>
  addPool: (name: string) => Promise<PoolActionResult>
  renamePool: (id: string, name: string) => Promise<PoolActionResult>
  deletePool: (id: string) => Promise<void>
  setActivePool: (id: string) => Promise<void>
}

async function loadActivePoolData(poolId: string): Promise<void> {
  await Promise.all([
    useSticksStore.getState().loadForPool(poolId),
    useBinStore.getState().loadForPool(poolId),
  ])
}

export const usePoolsStore = create<PoolsState>((set, get) => ({
  pools: [],
  activePoolId: null,
  loaded: false,

  loadPools: async () => {
    const pools = await poolRepository.getAllPools()
    const currentActive = get().activePoolId
    const activePoolId =
      currentActive && pools.some((p) => p.id === currentActive)
        ? currentActive
        : (pools[0]?.id ?? null)
    set({ pools, activePoolId, loaded: true })
    if (activePoolId) {
      await loadActivePoolData(activePoolId)
    }
  },

  addPool: async (name) => {
    if (!isNonEmptyName(name)) return { ok: false, error: 'empty' }
    if (!isPoolNameUnique(name, get().pools)) return { ok: false, error: 'duplicate' }

    const pool = createPool(name.trim())
    await poolRepository.addPool(pool)
    set((state) => ({ pools: [...state.pools, pool] }))
    await get().setActivePool(pool.id)
    return { ok: true }
  },

  renamePool: async (id, name) => {
    if (!isNonEmptyName(name)) return { ok: false, error: 'empty' }
    if (!isPoolNameUnique(name, get().pools, id)) return { ok: false, error: 'duplicate' }

    const existing = get().pools.find((p) => p.id === id)
    if (!existing) return { ok: false, error: 'duplicate' }

    const updated: Pool = { ...existing, name: name.trim() }
    await poolRepository.updatePool(updated)
    set((state) => ({ pools: state.pools.map((p) => (p.id === id ? updated : p)) }))
    return { ok: true }
  },

  deletePool: async (id) => {
    const poolsBefore = get().pools

    const sticksToDelete = await stickRepository.getSticksForPool(id)
    await Promise.all(sticksToDelete.map((s) => stickRepository.deleteStick(s.id)))
    await weeklyBinRepository.deleteBinForPool(id)
    await poolRepository.deletePool(id)

    const poolsAfter = deletePoolWithSafeguard(poolsBefore, id)
    const safeguardPool = poolsAfter.find((p) => !poolsBefore.some((b) => b.id === p.id))
    if (safeguardPool) {
      await poolRepository.addPool(safeguardPool)
    }

    set({ pools: poolsAfter })

    if (get().activePoolId === id) {
      const nextActive = poolsAfter[0]?.id ?? null
      if (nextActive) await get().setActivePool(nextActive)
    }
  },

  setActivePool: async (id) => {
    set({ activePoolId: id })
    await loadActivePoolData(id)
  },
}))
