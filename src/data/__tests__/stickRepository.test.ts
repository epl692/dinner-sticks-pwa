import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { createStick } from '../../domain/entities/stick'
import { db } from '../db'
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

  it('rejects a case-insensitive duplicate name within the same pool', async () => {
    const pool = createPool('Dinner')
    await addPool(pool)
    await addStick(createStick(pool.id, 'Tacos'))
    await expect(addStick(createStick(pool.id, 'tacos'))).rejects.toThrow()
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
