import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { createWeeklyBin } from '../entities/weeklyBin'
import { removeStickFromBin } from '../rules/removeFromBin'

describe('removeStickFromBin', () => {
  it('drops an active stick without replacement', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [stick.id])

    const result = removeStickFromBin(bin, stick.id)

    expect(result.activeStickIds).toEqual([])
  })

  it('drops a done stick too', () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')
    const bin = { ...createWeeklyBin(pool.id, []), doneStickIds: [stick.id] }

    const result = removeStickFromBin(bin, stick.id)

    expect(result.doneStickIds).toEqual([])
  })
})
