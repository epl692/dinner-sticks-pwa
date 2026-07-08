import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { db } from '../db'
import {
  addPool,
  deletePool,
  getAllPools,
  getPool,
  updatePool,
} from '../repositories/poolRepository'

beforeEach(async () => {
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('poolRepository', () => {
  it('adds and retrieves a pool', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    expect(await getPool(pool.id)).toEqual(pool)
  })

  it('lists all pools', async () => {
    const a = createPool('Dinner')
    const b = createPool('Lunch')
    await addPool(a)
    await addPool(b)
    const all = await getAllPools()
    expect(all.map((p) => p.id).sort()).toEqual([a.id, b.id].sort())
  })

  it('rejects a case-insensitive duplicate name at the DB boundary (defense-in-depth)', async () => {
    await addPool(createPool('Dinner'))
    await expect(addPool(createPool('dinner'))).rejects.toThrow()
  })

  it('updates a pool', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    await updatePool({ ...pool, name: 'Supper' })
    expect((await getPool(pool.id))?.name).toBe('Supper')
  })

  it('deletes a pool', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    await deletePool(pool.id)
    expect(await getPool(pool.id)).toBeUndefined()
  })
})
