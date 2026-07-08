import Dexie, { type EntityTable } from 'dexie'
import type { WeeklyBin } from '../domain/entities/weeklyBin'

/**
 * Storage-only shape: adds a normalized `nameLower` field purely so Dexie can
 * enforce case-insensitive name uniqueness (§6.6) at the DB boundary, as
 * defense-in-depth alongside the domain-layer checks in nameUniqueness.ts.
 * Repositories strip this field before returning entities to the rest of the app.
 */
export interface StoredPool {
  id: string
  name: string
  nameLower: string
  createdAt: number
}

export interface StoredStick {
  id: string
  poolId: string
  name: string
  nameLower: string
  createdAt: number
}

export class DinnerSticksDB extends Dexie {
  pools!: EntityTable<StoredPool, 'id'>
  sticks!: EntityTable<StoredStick, 'id'>
  weeklyBins!: EntityTable<WeeklyBin, 'id'>

  constructor(name = 'dinner-sticks') {
    super(name)
    this.version(1).stores({
      pools: 'id, &nameLower',
      sticks: 'id, poolId, &[poolId+nameLower]',
      weeklyBins: 'id, &poolId',
    })
  }
}

export const db = new DinnerSticksDB()
