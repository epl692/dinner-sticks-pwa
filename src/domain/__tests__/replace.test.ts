import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { createWeeklyBin } from '../entities/weeklyBin'
import { getReplaceCandidates, replaceRandomCandidate, replaceWithChoice } from '../rules/replace'

describe('getReplaceCandidates', () => {
  it('excludes sticks already active or done in the bin', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const done = createStick(pool.id, 'Pizza')
    const candidate = createStick(pool.id, 'Soup')
    const bin = { ...createWeeklyBin(pool.id, [active.id]), doneStickIds: [done.id] }

    const candidates = getReplaceCandidates([active, done, candidate], bin)

    expect(candidates).toEqual([candidate])
  })
})

describe('replaceRandomCandidate', () => {
  it('swaps the target stick for one drawn from the candidate set', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const candidate = createStick(pool.id, 'Soup')
    const bin = createWeeklyBin(pool.id, [active.id])

    const result = replaceRandomCandidate([active, candidate], bin, active.id)

    expect(result).not.toBeNull()
    expect(result!.activeStickIds).toEqual([candidate.id])
  })

  it('returns null and leaves the stick unchanged when no candidates are available', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const bin = createWeeklyBin(pool.id, [active.id])

    const result = replaceRandomCandidate([active], bin, active.id)

    expect(result).toBeNull()
  })

  it('preserves position in the ordered active list', () => {
    const pool = createPool('Dinner')
    const a = createStick(pool.id, 'A')
    const b = createStick(pool.id, 'B')
    const candidate = createStick(pool.id, 'C')
    const bin = createWeeklyBin(pool.id, [a.id, b.id])

    const result = replaceRandomCandidate([a, b, candidate], bin, b.id)

    expect(result!.activeStickIds).toEqual([a.id, candidate.id])
  })
})

describe('replaceWithChoice', () => {
  it('replaces with the exact chosen stick', () => {
    const pool = createPool('Dinner')
    const active = createStick(pool.id, 'Tacos')
    const chosen = createStick(pool.id, 'Soup')
    const bin = createWeeklyBin(pool.id, [active.id])

    const result = replaceWithChoice(bin, active.id, chosen.id)

    expect(result.activeStickIds).toEqual([chosen.id])
  })
})
