import Dexie, { type EntityTable } from 'dexie'
import type { Pool } from '../../domain/entities/pool'
import type { Stick } from '../../domain/entities/stick'
import type { WeeklyBin } from '../../domain/entities/weeklyBin'

/**
 * Read-only access to the meal library that older versions kept in this browser's IndexedDB
 * (before the app synced). It exists only so that data can be offered for upload into the
 * family on first launch; nothing in the app writes to it any more, and it is never deleted,
 * so it stays on the device as a backup.
 */
const LEGACY_DB_NAME = 'dinner-sticks'

interface LegacyStored {
  id: string
  name: string
  createdAt: number
}
interface LegacyStoredStick extends LegacyStored {
  poolId: string
}

export interface LegacyLibrary {
  pools: Pool[]
  sticks: Stick[]
  bins: WeeklyBin[]
}

class LegacyDB extends Dexie {
  pools!: EntityTable<LegacyStored, 'id'>
  sticks!: EntityTable<LegacyStoredStick, 'id'>
  weeklyBins!: EntityTable<WeeklyBin, 'id'>

  constructor() {
    super(LEGACY_DB_NAME)
    this.version(1).stores({
      pools: 'id, &nameLower',
      sticks: 'id, poolId, &[poolId+nameLower]',
      weeklyBins: 'id, &poolId',
    })
  }
}

/** Returns the old on-device library, or null if there is none (never created, or empty). */
export async function readLegacyLibrary(): Promise<LegacyLibrary | null> {
  try {
    if (!(await Dexie.exists(LEGACY_DB_NAME))) return null
    const legacy = new LegacyDB()
    try {
      const [pools, sticks, bins] = await Promise.all([
        legacy.pools.toArray(),
        legacy.sticks.toArray(),
        legacy.weeklyBins.toArray(),
      ])
      if (pools.length === 0 && sticks.length === 0) return null
      return {
        pools: pools.map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })),
        sticks: sticks.map((s) => ({
          id: s.id,
          poolId: s.poolId,
          name: s.name,
          createdAt: s.createdAt,
        })),
        bins,
      }
    } finally {
      legacy.close()
    }
  } catch {
    return null
  }
}
