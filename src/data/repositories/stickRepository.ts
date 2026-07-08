import type { Stick } from '../../domain/entities/stick'
import { normalizeName } from '../../domain/rules/nameUniqueness'
import { db, type StoredStick } from '../db'

function toDomain(stored: StoredStick): Stick {
  return { id: stored.id, poolId: stored.poolId, name: stored.name, createdAt: stored.createdAt }
}

export async function getSticksForPool(poolId: string): Promise<Stick[]> {
  const stored = await db.sticks.where('poolId').equals(poolId).toArray()
  return stored.map(toDomain)
}

/** Across all pools — used for library export (§4.6), not for per-pool screens. */
export async function getAllSticks(): Promise<Stick[]> {
  const stored = await db.sticks.toArray()
  return stored.map(toDomain)
}

export async function getStick(id: string): Promise<Stick | undefined> {
  const stored = await db.sticks.get(id)
  return stored ? toDomain(stored) : undefined
}

export async function addStick(stick: Stick): Promise<void> {
  await db.sticks.add({ ...stick, nameLower: normalizeName(stick.name) })
}

export async function updateStick(stick: Stick): Promise<void> {
  await db.sticks.put({ ...stick, nameLower: normalizeName(stick.name) })
}

export async function deleteStick(id: string): Promise<void> {
  await db.sticks.delete(id)
}
