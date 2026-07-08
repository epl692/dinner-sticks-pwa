import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { createWeeklyBin } from '../entities/weeklyBin'
import { markStickDone } from '../rules/markDone'
import { filterActiveDisplayable, filterDoneDisplayable } from '../rules/staleReferences'

describe('stale reference filtering', () => {
  it('excludes bin references to sticks no longer in the pool', () => {
    const pool = createPool('Dinner')
    const kept = createStick(pool.id, 'Tacos')
    const deleted = createStick(pool.id, 'Pizza')
    const bin = createWeeklyBin(pool.id, [kept.id, deleted.id])

    // Simulate deletion: pool's current stick list no longer includes `deleted`.
    const currentPoolSticks = [kept]

    expect(filterActiveDisplayable(bin, currentPoolSticks)).toEqual([kept])
  })

  it('filters done sticks the same way, independently of active', () => {
    const pool = createPool('Dinner')
    const kept = createStick(pool.id, 'Tacos')
    const deleted = createStick(pool.id, 'Pizza')
    let bin = createWeeklyBin(pool.id, [kept.id, deleted.id])
    bin = markStickDone(bin, deleted.id)

    expect(filterActiveDisplayable(bin, [kept])).toEqual([kept])
    expect(filterDoneDisplayable(bin, [kept])).toEqual([])
  })

  it('is a pure filter — never mutates the bin', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [stick.id])
    const before = { ...bin, activeStickIds: [...bin.activeStickIds] }

    filterActiveDisplayable(bin, [])

    expect(bin).toEqual(before)
  })
})
