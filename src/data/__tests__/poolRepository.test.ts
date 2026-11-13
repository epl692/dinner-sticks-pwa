import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { testDb as db } from '../../test/testData'
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

  // Name uniqueness is enforced by the domain layer (isPoolNameUnique) before a write. Storage cannot enforce it:
  // two family members offline can each create "Dinner", and both pools arrive when they sync. That must not
  // lose or hide either pool.
  it('keeps both pools when same-named pools made on different devices meet', async () => {
    await addPool(createPool('Dinner'))
    await addPool(createPool('dinner'))
    expect(await getAllPools()).toHaveLength(2)
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
