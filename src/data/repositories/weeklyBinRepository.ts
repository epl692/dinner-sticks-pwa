import type { SyncableObject } from '@sync/core'
import type { WeeklyBin } from '../../domain/entities/weeklyBin'
import { getDataContext, listObjects, TYPE } from '../../sync/dataContext'

/*
 * Storage model. The domain's WeeklyBin (two ordered id lists) is stored as one `dinner.bin`
 * object plus one `dinner.binItem` object per stick in it. Per-item objects are what let two
 * family members change the same week's plan at the same time without one overwriting the
 * other: concurrent adds both survive, and marking a stick done only touches that stick.
 * `pos` orders items within their list (active / done); ties are broken by id.
 */

type ItemStatus = 'active' | 'done'

interface Item {
  objectId: string
  stickId: string
  status: ItemStatus
  pos: number
}

function compareItems(a: Item, b: Item): number {
  return a.pos - b.pos || (a.objectId < b.objectId ? -1 : a.objectId > b.objectId ? 1 : 0)
}

function toItem(o: SyncableObject): Item {
  return {
    objectId: o.id,
    stickId: String(o.fields.stickId ?? ''),
    status: o.fields.status === 'done' ? 'done' : 'active',
    pos: Number(o.fields.pos ?? 0),
  }
}

/** The newest bin for a pool wins; any other is a leftover from a draw confirmed at the same time elsewhere. */
function newestFirst(a: SyncableObject, b: SyncableObject): number {
  const d = Number(b.fields.createdAt ?? 0) - Number(a.fields.createdAt ?? 0)
  return d || (a.id < b.id ? -1 : 1)
}

async function binsForPool(poolId: string): Promise<SyncableObject[]> {
  const { core, space } = getDataContext()
  const rows = await core
    .query({ space, type: TYPE.bin, where: (o) => o.fields.poolId === poolId })
    .once()
  return rows.sort(newestFirst)
}

async function itemsForBin(binId: string): Promise<Item[]> {
  const { core, space } = getDataContext()
  const rows = await core
    .query({ space, type: TYPE.binItem, where: (o) => o.fields.binId === binId })
    .once()
  return rows.map(toItem)
}

function toBin(bin: SyncableObject, items: Item[]): WeeklyBin {
  // If the same stick was added twice at once, keep one entry; "done" wins since marking done is idempotent (§6.4).
  const byStick = new Map<string, Item>()
  for (const item of [...items].sort(compareItems)) {
    const prev = byStick.get(item.stickId)
    if (!prev) byStick.set(item.stickId, item)
    else if (item.status === 'done' && prev.status !== 'done')
      byStick.set(item.stickId, { ...item, pos: prev.pos })
  }
  const kept = [...byStick.values()]
  return {
    id: bin.id,
    poolId: String(bin.fields.poolId ?? ''),
    activeStickIds: kept
      .filter((i) => i.status === 'active')
      .sort(compareItems)
      .map((i) => i.stickId),
    doneStickIds: kept
      .filter((i) => i.status === 'done')
      .sort(compareItems)
      .map((i) => i.stickId),
    createdAt: Number(bin.fields.createdAt ?? 0),
    updatedAt: Number(bin.fields.updatedAt ?? bin.fields.createdAt ?? 0),
  }
}

/**
 * Positions for an ordered id list. Ids that already have one keep it, so unchanged items are never
 * rewritten; new ids get positions between their neighbours (or past the ends).
 */
export function assignPositions(
  ids: string[],
  known: ReadonlyMap<string, number>,
): Map<string, number> {
  const out = new Map<string, number>()
  let i = 0
  while (i < ids.length) {
    const existing = known.get(ids[i])
    if (existing !== undefined) {
      out.set(ids[i], existing)
      i++
      continue
    }
    let j = i
    while (j < ids.length && known.get(ids[j]) === undefined) j++
    const prev = i > 0 ? out.get(ids[i - 1]) : undefined
    const next = j < ids.length ? known.get(ids[j]) : undefined
    const run = j - i
    for (let k = 0; k < run; k++) {
      let pos: number
      if (prev !== undefined && next !== undefined)
        pos = prev + ((next - prev) * (k + 1)) / (run + 1)
      else if (prev !== undefined) pos = prev + (k + 1)
      else if (next !== undefined) pos = next - (run - k)
      else pos = k
      out.set(ids[i + k], pos)
    }
    i = j
  }
  return out
}

export async function getBinForPool(poolId: string): Promise<WeeklyBin | undefined> {
  const [bin] = await binsForPool(poolId)
  if (!bin) return undefined
  return toBin(bin, await itemsForBin(bin.id))
}

/** Updates an existing bin in place (same id) — used by replace/remove/add/markDone. */
export async function upsertBin(next: WeeklyBin): Promise<void> {
  const { core, space } = getDataContext()
  const stored = await core.get(next.id)
  if (!stored) {
    await core.create(
      space,
      TYPE.bin,
      { poolId: next.poolId, createdAt: next.createdAt, updatedAt: next.updatedAt },
      { id: next.id },
    )
  } else {
    await core.update(next.id, { updatedAt: next.updatedAt })
  }

  const items = await itemsForBin(next.id)
  const wanted = new Map<string, ItemStatus>()
  for (const id of next.doneStickIds) wanted.set(id, 'done')
  for (const id of next.activeStickIds) wanted.set(id, 'active')

  // Sticks no longer in the bin: drop every item for them.
  for (const item of items) {
    if (!wanted.has(item.stickId)) await core.remove(item.objectId)
  }

  for (const status of ['active', 'done'] as const) {
    const ids = status === 'active' ? next.activeStickIds : next.doneStickIds
    const mine = items.filter((i) => i.status === status && wanted.get(i.stickId) === status)
    const known = new Map(mine.map((i) => [i.stickId, i.pos]))
    const positions = assignPositions(ids, known)
    for (const stickId of ids) {
      const pos = positions.get(stickId) ?? 0
      const rows = items.filter((i) => i.stickId === stickId)
      if (rows.length === 0) {
        await core.create(space, TYPE.binItem, { binId: next.id, stickId, status, pos })
        continue
      }
      for (const row of rows) {
        if (row.status !== status || row.pos !== pos)
          await core.update(row.objectId, { status, pos })
      }
    }
  }
}

async function removeBinCompletely(bin: SyncableObject): Promise<void> {
  const { core } = getDataContext()
  for (const item of await itemsForBin(bin.id)) await core.remove(item.objectId)
  await core.remove(bin.id)
}

/**
 * Confirming a draw creates a brand-new WeeklyBin (new id) that replaces any prior bin for the
 * pool (§4.2). The new bin is written first, so there is never a moment with no bin.
 */
export async function replaceBinForPool(bin: WeeklyBin): Promise<void> {
  const previous = (await binsForPool(bin.poolId)).filter((b) => b.id !== bin.id)
  await upsertBin(bin)
  for (const old of previous) await removeBinCompletely(old)
}

export async function deleteBinForPool(poolId: string): Promise<void> {
  for (const bin of await binsForPool(poolId)) await removeBinCompletely(bin)
}

/** Removes every bin and bin item (used by import-replace). */
export async function deleteAllBins(): Promise<void> {
  const { core } = getDataContext()
  for (const o of await listObjects(TYPE.binItem)) await core.remove(o.id)
  for (const o of await listObjects(TYPE.bin)) await core.remove(o.id)
}
