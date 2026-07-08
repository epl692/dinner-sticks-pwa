import type { WeeklyBin } from '../../domain/entities/weeklyBin'
import { db } from '../db'

export async function getBinForPool(poolId: string): Promise<WeeklyBin | undefined> {
  return db.weeklyBins.where('poolId').equals(poolId).first()
}

/** Updates an existing bin in place (same id) — used by replace/remove/add/markDone. */
export async function upsertBin(bin: WeeklyBin): Promise<void> {
  await db.weeklyBins.put(bin)
}

/**
 * Confirming a draw creates a brand-new WeeklyBin (new id) that must replace any
 * prior bin for the pool (§4.2). The &poolId unique index would reject a naive put
 * of a differently-id'd record, so the old bin is deleted first, atomically.
 */
export async function replaceBinForPool(bin: WeeklyBin): Promise<void> {
  await db.transaction('rw', db.weeklyBins, async () => {
    const existing = await getBinForPool(bin.poolId)
    if (existing && existing.id !== bin.id) {
      await db.weeklyBins.delete(existing.id)
    }
    await db.weeklyBins.put(bin)
  })
}

export async function deleteBinForPool(poolId: string): Promise<void> {
  const existing = await getBinForPool(poolId)
  if (existing) {
    await db.weeklyBins.delete(existing.id)
  }
}
