import type { Pool } from '../entities/pool'
import type { Stick } from '../entities/stick'
import type { WeeklyBin } from '../entities/weeklyBin'
import { normalizeName } from '../rules/nameUniqueness'

export interface LegacyMergeInput {
  existingPools: Pool[]
  existingSticks: Stick[]
  /** Pool ids that already have a weekly bin in the family. */
  poolsWithBin: ReadonlySet<string>
  legacy: { pools: Pool[]; sticks: Stick[]; bins: WeeklyBin[] }
}

export interface LegacyMergePlan {
  poolsToAdd: Pool[]
  sticksToAdd: Stick[]
  binsToAdd: WeeklyBin[]
}

/**
 * Plans an additive upload of a device's pre-sync library into a family's (§4.7). Nothing in the
 * family is changed or removed: a pool or meal that matches by name (case-insensitive, per the §6
 * uniqueness scopes) is treated as already there, so two people uploading the same old meals do
 * not create duplicates. A legacy weekly bin is only carried over where the family has none.
 */
export function planLegacyMerge(input: LegacyMergeInput): LegacyMergePlan {
  const { existingPools, existingSticks, poolsWithBin, legacy } = input

  const poolByName = new Map(existingPools.map((p) => [normalizeName(p.name), p]))
  const stickKey = (poolId: string, name: string) => `${poolId}\u0000${normalizeName(name)}`
  const stickByKey = new Map(existingSticks.map((s) => [stickKey(s.poolId, s.name), s]))

  const poolsToAdd: Pool[] = []
  const sticksToAdd: Stick[] = []
  const targetPool = new Map<string, Pool>() // legacy pool id -> pool in the family
  const targetStick = new Map<string, Stick>() // legacy stick id -> stick in the family

  for (const lp of legacy.pools) {
    const key = normalizeName(lp.name)
    let target = poolByName.get(key)
    if (!target) {
      target = { id: lp.id, name: lp.name, createdAt: lp.createdAt }
      poolByName.set(key, target)
      poolsToAdd.push(target)
    }
    targetPool.set(lp.id, target)
  }

  for (const ls of legacy.sticks) {
    const pool = targetPool.get(ls.poolId)
    if (!pool) continue // orphaned in the old database
    const key = stickKey(pool.id, ls.name)
    let target = stickByKey.get(key)
    if (!target) {
      target = { id: ls.id, poolId: pool.id, name: ls.name, createdAt: ls.createdAt }
      stickByKey.set(key, target)
      sticksToAdd.push(target)
    }
    targetStick.set(ls.id, target)
  }

  const binsToAdd: WeeklyBin[] = []
  const hasBin = new Set(poolsWithBin)
  for (const lb of legacy.bins) {
    const pool = targetPool.get(lb.poolId)
    if (!pool || hasBin.has(pool.id)) continue
    const remap = (ids: string[]) => {
      const out: string[] = []
      for (const id of ids) {
        const stick = targetStick.get(id)
        if (stick && !out.includes(stick.id)) out.push(stick.id)
      }
      return out
    }
    const done = remap(lb.doneStickIds)
    const active = remap(lb.activeStickIds).filter((id) => !done.includes(id))
    if (active.length === 0 && done.length === 0) continue
    hasBin.add(pool.id)
    binsToAdd.push({ ...lb, poolId: pool.id, activeStickIds: active, doneStickIds: done })
  }

  return { poolsToAdd, sticksToAdd, binsToAdd }
}
