import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { createWeeklyBin } from '../entities/weeklyBin'
import { markStickDone } from '../rules/markDone'

describe('markStickDone', () => {
  it('moves the stick from active to done', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [stick.id])

    const result = markStickDone(bin, stick.id)

    expect(result.activeStickIds).not.toContain(stick.id)
    expect(result.doneStickIds).toContain(stick.id)
  })

  it('is idempotent — marking an already-done stick done again changes nothing observable', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    let bin = createWeeklyBin(pool.id, [stick.id])
    bin = markStickDone(bin, stick.id)

    const result = markStickDone(bin, stick.id)

    expect(result.activeStickIds).toEqual([])
    expect(result.doneStickIds).toEqual([stick.id])
  })

  it('marking a stick not present in the bin at all still results in it being done', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [])

    const result = markStickDone(bin, stick.id)

    expect(result.doneStickIds).toEqual([stick.id])
  })
})
