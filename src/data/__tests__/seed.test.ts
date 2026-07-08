import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_POOL_NAME } from '../../domain/rules/poolLifecycle'
import { db } from '../db'
import { addPool } from '../repositories/poolRepository'
import { seedIfEmpty } from '../seed'
import { createPool } from '../../domain/entities/pool'

beforeEach(async () => {
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('seedIfEmpty', () => {
  it('creates a single empty Dinner pool on a fresh install', async () => {
    await seedIfEmpty()
    const pools = await db.pools.toArray()
    expect(pools).toHaveLength(1)
    expect(pools[0].name).toBe(DEFAULT_POOL_NAME)
  })

  it('does nothing if a pool already exists', async () => {
    await addPool(createPool('Breakfast'))
    await seedIfEmpty()
    const pools = await db.pools.toArray()
    expect(pools).toHaveLength(1)
    expect(pools[0].name).toBe('Breakfast')
  })
})
