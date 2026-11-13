import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { createWeeklyBin } from '../entities/weeklyBin'
import { planLegacyMerge } from '../io/mergeLegacy'

describe('planLegacyMerge', () => {
  it('adds everything when the family is empty', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [stick.id])
    const plan = planLegacyMerge({
      existingPools: [],
      existingSticks: [],
      poolsWithBin: new Set(),
      legacy: { pools: [pool], sticks: [stick], bins: [bin] },
    })
    expect(plan.poolsToAdd).toEqual([pool])
    expect(plan.sticksToAdd).toEqual([stick])
    expect(plan.binsToAdd).toEqual([bin])
  })

  it('merges into a same-named pool and skips meals the family already has', () => {
    const family = createPool('Dinner')
    const familyTacos = createStick(family.id, 'Tacos')
    const legacyPool = createPool('dinner')
    const legacyTacos = createStick(legacyPool.id, 'TACOS')
    const legacySoup = createStick(legacyPool.id, 'Soup')
    const bin = createWeeklyBin(legacyPool.id, [legacyTacos.id, legacySoup.id])

    const plan = planLegacyMerge({
      existingPools: [family],
      existingSticks: [familyTacos],
      poolsWithBin: new Set(),
      legacy: { pools: [legacyPool], sticks: [legacyTacos, legacySoup], bins: [bin] },
    })

    expect(plan.poolsToAdd).toEqual([])
    expect(plan.sticksToAdd).toEqual([{ ...legacySoup, poolId: family.id }])
    expect(plan.binsToAdd).toHaveLength(1)
    expect(plan.binsToAdd[0].poolId).toBe(family.id)
    expect(plan.binsToAdd[0].activeStickIds).toEqual([familyTacos.id, legacySoup.id])
  })

  it('does not replace a weekly plan the family already has', () => {
    const family = createPool('Dinner')
    const legacyPool = createPool('Dinner')
    const stick = createStick(legacyPool.id, 'Soup')
    const plan = planLegacyMerge({
      existingPools: [family],
      existingSticks: [],
      poolsWithBin: new Set([family.id]),
      legacy: {
        pools: [legacyPool],
        sticks: [stick],
        bins: [createWeeklyBin(legacyPool.id, [stick.id])],
      },
    })
    expect(plan.binsToAdd).toEqual([])
    expect(plan.sticksToAdd).toHaveLength(1)
  })

  it('allows the same meal name in different pools (§6 scopes)', () => {
    const dinner = createPool('Dinner')
    const lunch = createPool('Lunch')
    const dinnerTacos = createStick(dinner.id, 'Tacos')
    const lunchTacos = createStick(lunch.id, 'Tacos')
    const plan = planLegacyMerge({
      existingPools: [],
      existingSticks: [],
      poolsWithBin: new Set(),
      legacy: { pools: [dinner, lunch], sticks: [dinnerTacos, lunchTacos], bins: [] },
    })
    expect(plan.sticksToAdd).toHaveLength(2)
  })

  it('drops bin entries whose meal no longer exists', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [stick.id, 'deleted-stick'])
    const plan = planLegacyMerge({
      existingPools: [],
      existingSticks: [],
      poolsWithBin: new Set(),
      legacy: { pools: [pool], sticks: [stick], bins: [bin] },
    })
    expect(plan.binsToAdd[0].activeStickIds).toEqual([stick.id])
  })
})
