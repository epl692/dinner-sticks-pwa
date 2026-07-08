import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { createWeeklyBin } from '../entities/weeklyBin'
import { addStickToBin, getAddCandidates } from '../rules/addToBin'

describe('getAddCandidates', () => {
  it('shares the same not-in-bin candidate logic as Replace', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const done = createStick(pool.id, 'Pizza')
    const candidate = createStick(pool.id, 'Soup')
    const bin = { ...createWeeklyBin(pool.id, [active.id]), doneStickIds: [done.id] }

    expect(getAddCandidates([active, done, candidate], bin)).toEqual([candidate])
  })

  it('is empty when every pool stick is already in the bin', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [active.id])

    expect(getAddCandidates([active], bin)).toEqual([])
  })
})

describe('addStickToBin', () => {
  it('appends the chosen stick without removing anything', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const toAdd = createStick(pool.id, 'Soup')
    const bin = createWeeklyBin(pool.id, [active.id])

    const result = addStickToBin(bin, toAdd.id)

    expect(result.activeStickIds).toEqual([active.id, toAdd.id])
  })

  it('is not capped at 5 — the bin can grow past the original draw size', () => {
    const pool = createPool('Dinner')
    const sticks = Array.from({ length: 7 }, (_, i) => createStick(pool.id, `Meal ${i}`))
    let bin = createWeeklyBin(pool.id, sticks.slice(0, 5).map((s) => s.id))

    bin = addStickToBin(bin, sticks[5].id)
    bin = addStickToBin(bin, sticks[6].id)

    expect(bin.activeStickIds).toHaveLength(7)
  })

  it('is a no-op when the stick is already active or done', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const done = createStick(pool.id, 'Pizza')
    const bin = { ...createWeeklyBin(pool.id, [active.id]), doneStickIds: [done.id] }

    expect(addStickToBin(bin, active.id)).toEqual(bin)
    expect(addStickToBin(bin, done.id)).toEqual(bin)
  })

  it('maintains disjointness between active and done', () => {
    const pool = createPool('Dinner')
    const done = createStick(pool.id, 'Pizza')
    const toAdd = createStick(pool.id, 'Soup')
    const bin = { ...createWeeklyBin(pool.id, []), doneStickIds: [done.id] }

    const result = addStickToBin(bin, toAdd.id)

    const overlap = result.activeStickIds.filter((id) => result.doneStickIds.includes(id))
    expect(overlap).toEqual([])
  })
})
