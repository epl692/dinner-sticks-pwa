import type { Pool } from '../../domain/entities/pool'
import type { Stick } from '../../domain/entities/stick'
import { normalizeName } from '../../domain/rules/nameUniqueness'
import { db } from '../db'

/**
 * Import is all-or-nothing (§4.6, §6.9): clears pools, sticks, and weeklyBins in a
 * single transaction and bulk-inserts the imported pools/sticks. Bins are cleared,
 * not left dangling, since the sticks they reference no longer exist afterward.
 */
export async function replaceLibrary(pools: Pool[], sticks: Stick[]): Promise<void> {
  await db.transaction('rw', db.pools, db.sticks, db.weeklyBins, async () => {
    await db.pools.clear()
    await db.sticks.clear()
    await db.weeklyBins.clear()
    await db.pools.bulkAdd(pools.map((p) => ({ ...p, nameLower: normalizeName(p.name) })))
    await db.sticks.bulkAdd(sticks.map((s) => ({ ...s, nameLower: normalizeName(s.name) })))
  })
}
