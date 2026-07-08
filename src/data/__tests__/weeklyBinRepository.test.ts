import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { createWeeklyBin } from '../../domain/entities/weeklyBin'
import { db } from '../db'
import {
  deleteBinForPool,
  getBinForPool,
  replaceBinForPool,
  upsertBin,
} from '../repositories/weeklyBinRepository'

beforeEach(async () => {
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('weeklyBinRepository', () => {
  it('stores and retrieves a bin for a pool', async () => {
    const pool = createPool('Dinner')
    const bin = createWeeklyBin(pool.id, ['stick-1'])
    await upsertBin(bin)
    expect(await getBinForPool(pool.id)).toEqual(bin)
  })

  it('upsertBin updates the same bin in place', async () => {
    const pool = createPool('Dinner')
    const bin = createWeeklyBin(pool.id, ['stick-1'])
    await upsertBin(bin)

    const updated = { ...bin, activeStickIds: ['stick-1', 'stick-2'] }
    await upsertBin(updated)

    const fetched = await getBinForPool(pool.id)
    expect(fetched?.activeStickIds).toEqual(['stick-1', 'stick-2'])
  })

  it("replaceBinForPool swaps out a differently-id'd bin, keeping only one per pool", async () => {
    const pool = createPool('Dinner')
    const first = createWeeklyBin(pool.id, ['stick-1'])
    await upsertBin(first)

    const second = createWeeklyBin(pool.id, ['stick-2', 'stick-3'])
    await replaceBinForPool(second)

    const fetched = await getBinForPool(pool.id)
    expect(fetched?.id).toBe(second.id)
    expect(fetched?.activeStickIds).toEqual(['stick-2', 'stick-3'])
    expect(await db.weeklyBins.count()).toBe(1)
  })

  it('deletes a bin for a pool', async () => {
    const pool = createPool('Dinner')
    await upsertBin(createWeeklyBin(pool.id, ['stick-1']))
    await deleteBinForPool(pool.id)
    expect(await getBinForPool(pool.id)).toBeUndefined()
  })
})
