import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { createStick } from '../../domain/entities/stick'
import { testDb as db } from '../../test/testData'
import { addPool } from '../repositories/poolRepository'
import {
  addStick,
  deleteStick,
  getSticksForPool,
  getStick,
  updateStick,
} from '../repositories/stickRepository'

beforeEach(async () => {
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('stickRepository', () => {
  it('adds and retrieves a stick', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    const stick = createStick(pool.id, 'Tacos')
    await addStick(stick)
    expect(await getStick(stick.id)).toEqual(stick)
  })

  it('lists sticks scoped to one pool', async () => {
    const poolA = createPool('Dinner')
    const poolB = createPool('Lunch')
    await addPool(poolA)
    await addPool(poolB)
    const stickA = createStick(poolA.id, 'Tacos')
    const stickB = createStick(poolB.id, 'Soup')
    await addStick(stickA)
    await addStick(stickB)

    const sticksInA = await getSticksForPool(poolA.id)
    expect(sticksInA.map((s) => s.id)).toEqual([stickA.id])
  })

  // As for pools: uniqueness is a domain-layer rule (isStickNameUnique); storage keeps both if two devices race.
  it('keeps both sticks when same-named sticks added on different devices meet', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    await addStick(createStick(pool.id, 'Tacos'))
    await addStick(createStick(pool.id, 'tacos'))
    expect(await getSticksForPool(pool.id)).toHaveLength(2)
  })

  it('allows the same name to exist independently in a different pool', async () => {
    const poolA = createPool('Dinner')
    const poolB = createPool('Lunch')
    await addPool(poolA)
    await addPool(poolB)
    await addStick(createStick(poolA.id, 'Tacos'))
    await expect(addStick(createStick(poolB.id, 'Tacos'))).resolves.toBeUndefined()
  })

  it('updates and deletes a stick', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    const stick = createStick(pool.id, 'Tacos')
    await addStick(stick)

    await updateStick({ ...stick, name: 'Burritos' })
    expect((await getStick(stick.id))?.name).toBe('Burritos')

    await deleteStick(stick.id)
    expect(await getStick(stick.id)).toBeUndefined()
  })
})
