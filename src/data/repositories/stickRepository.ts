import type { SyncableObject } from '@sync/core'
import type { Stick } from '../../domain/entities/stick'
import { getDataContext, listObjects, TYPE } from '../../sync/dataContext'
import { byCreation } from './poolRepository'

function toStick(o: SyncableObject): Stick {
  return {
    id: o.id,
    poolId: String(o.fields.poolId ?? ''),
    name: String(o.fields.name ?? ''),
    createdAt: Number(o.fields.createdAt ?? 0),
  }
}

export async function getSticksForPool(poolId: string): Promise<Stick[]> {
  const { core, space } = getDataContext()
  const rows = await core
    .query({ space, type: TYPE.stick, where: (o) => o.fields.poolId === poolId })
    .once()
  return rows.map(toStick).sort(byCreation)
}

/** Across all pools — used for library export (§4.6), not for per-pool screens. */
export async function getAllSticks(): Promise<Stick[]> {
  return (await listObjects(TYPE.stick)).map(toStick).sort(byCreation)
}

export async function getStick(id: string): Promise<Stick | undefined> {
  const { core } = getDataContext()
  const o = await core.get(id)
  return o && o.type === TYPE.stick ? toStick(o) : undefined
}

export async function addStick(stick: Stick): Promise<void> {
  const { core, space } = getDataContext()
  await core.create(
    space,
    TYPE.stick,
    { poolId: stick.poolId, name: stick.name, createdAt: stick.createdAt },
    { id: stick.id },
  )
}

export async function updateStick(stick: Stick): Promise<void> {
  const { core } = getDataContext()
  await core.update(stick.id, { name: stick.name })
}

/** Never cascades into bins: a bin may keep a stale reference, which is filtered on read (§6). */
export async function deleteStick(id: string): Promise<void> {
  const { core } = getDataContext()
  await core.remove(id)
}
