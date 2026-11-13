import type { SyncableObject } from '@sync/core'
import type { Pool } from '../../domain/entities/pool'
import { getDataContext, listObjects, TYPE } from '../../sync/dataContext'

function toPool(o: SyncableObject): Pool {
  return {
    id: o.id,
    name: String(o.fields.name ?? ''),
    createdAt: Number(o.fields.createdAt ?? 0),
  }
}

/** Oldest first; ties broken by id so every device shows the same order. */
export function byCreation<T extends { createdAt: number; id: string }>(a: T, b: T): number {
  return a.createdAt - b.createdAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

export async function getAllPools(): Promise<Pool[]> {
  return (await listObjects(TYPE.pool)).map(toPool).sort(byCreation)
}

export async function getPool(id: string): Promise<Pool | undefined> {
  const { core } = getDataContext()
  const o = await core.get(id)
  return o && o.type === TYPE.pool ? toPool(o) : undefined
}

export async function addPool(pool: Pool): Promise<void> {
  const { core, space } = getDataContext()
  await core.create(
    space,
    TYPE.pool,
    { name: pool.name, createdAt: pool.createdAt },
    { id: pool.id },
  )
}

export async function updatePool(pool: Pool): Promise<void> {
  const { core } = getDataContext()
  await core.update(pool.id, { name: pool.name })
}

export async function deletePool(id: string): Promise<void> {
  const { core } = getDataContext()
  await core.remove(id)
}
