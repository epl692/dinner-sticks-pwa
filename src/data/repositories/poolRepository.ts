import type { Pool } from '../../domain/entities/pool'
import { normalizeName } from '../../domain/rules/nameUniqueness'
import { db, type StoredPool } from '../db'

function toDomain(stored: StoredPool): Pool {
  return { id: stored.id, name: stored.name, createdAt: stored.createdAt }
}

export async function getAllPools(): Promise<Pool[]> {
  const stored = await db.pools.toArray()
  return stored.map(toDomain)
}

export async function getPool(id: string): Promise<Pool | undefined> {
  const stored = await db.pools.get(id)
  return stored ? toDomain(stored) : undefined
}

export async function addPool(pool: Pool): Promise<void> {
  await db.pools.add({ ...pool, nameLower: normalizeName(pool.name) })
}

export async function updatePool(pool: Pool): Promise<void> {
  await db.pools.put({ ...pool, nameLower: normalizeName(pool.name) })
}

export async function deletePool(id: string): Promise<void> {
  await db.pools.delete(id)
}
