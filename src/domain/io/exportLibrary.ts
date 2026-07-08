import type { Pool } from '../entities/pool'
import type { Stick } from '../entities/stick'
import { LIBRARY_SCHEMA_VERSION, type LibraryFile } from './librarySchema'

/** Pools + Sticks only — no ids, timestamps, or weekly bin state (§4.6). */
export function serializeLibrary(pools: Pool[], sticks: Stick[]): LibraryFile {
  const poolNameById = new Map(pools.map((p) => [p.id, p.name]))
  return {
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    pools: pools.map((p) => ({ name: p.name })),
    sticks: sticks
      .filter((s) => poolNameById.has(s.poolId))
      .map((s) => ({ poolName: poolNameById.get(s.poolId)!, name: s.name })),
  }
}
