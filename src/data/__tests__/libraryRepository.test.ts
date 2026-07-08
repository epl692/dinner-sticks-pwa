import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { createStick } from '../../domain/entities/stick'
import { createWeeklyBin } from '../../domain/entities/weeklyBin'
import { db } from '../db'
import { replaceLibrary } from '../repositories/libraryRepository'
import { addPool } from '../repositories/poolRepository'
import { addStick } from '../repositories/stickRepository'
import { upsertBin } from '../repositories/weeklyBinRepository'

beforeEach(async () => {
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('replaceLibrary', () => {
  it('wipes existing pools, sticks, and bins and installs the new ones', async () => {
    const oldPool = createPool('Dinner')
    await addPool(oldPool)
    const oldStick = createStick(oldPool.id, 'Tacos')
    await addStick(oldStick)
    await upsertBin(createWeeklyBin(oldPool.id, [oldStick.id]))

    const newPool = createPool('Breakfast')
    const newStick = createStick(newPool.id, 'Pancakes')
    await replaceLibrary([newPool], [newStick])

    expect(await db.pools.toArray()).toHaveLength(1)
    expect((await db.pools.toArray())[0].name).toBe('Breakfast')
    expect(await db.sticks.toArray()).toHaveLength(1)
    expect(await db.weeklyBins.count()).toBe(0)
  })

  it('is atomic — a failure partway through leaves the previous library untouched', async () => {
    const existingPool = createPool('Dinner')
    await addPool(existingPool)
    const existingStick = createStick(existingPool.id, 'Tacos')
    await addStick(existingStick)

    const newPool = createPool('Breakfast')
    // Two sticks with a colliding (poolId, nameLower) pair violate the unique
    // index and should abort the whole transaction.
    const stickA = createStick(newPool.id, 'Pancakes')
    const stickB = createStick(newPool.id, 'pancakes')

    await expect(replaceLibrary([newPool], [stickA, stickB])).rejects.toThrow()

    // Previous data must be exactly as it was — no partial clear/apply.
    expect(await db.pools.toArray()).toEqual([{ ...existingPool, nameLower: 'dinner' }])
    expect(await db.sticks.toArray()).toEqual([{ ...existingStick, nameLower: 'tacos' }])
  })
})
