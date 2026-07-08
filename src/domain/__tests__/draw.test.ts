import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createSelectionSession } from '../entities/selectionSession'
import { createStick } from '../entities/stick'
import { discardAndRedraw, randomDraw } from '../rules/draw'

function makeSticks(poolId: string, count: number) {
  return Array.from({ length: count }, (_, i) => createStick(poolId, `Meal ${i}`))
}

describe('randomDraw', () => {
  it('caps at 5 when the pool has more than 5 sticks', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 20)
    const drawn = randomDraw(sticks)
    expect(drawn).toHaveLength(5)
  })

  it('draws all sticks, uncapped, when the pool has fewer than 5', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 3)
    const drawn = randomDraw(sticks)
    expect(drawn).toHaveLength(3)
  })

  it('never repeats a stick within one draw', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 20)
    const drawn = randomDraw(sticks)
    const ids = drawn.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('only draws from the given pool sticks', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 5)
    const drawn = randomDraw(sticks)
    const poolIds = new Set(sticks.map((s) => s.id))
    for (const stick of drawn) {
      expect(poolIds.has(stick.id)).toBe(true)
    }
  })

  it('returns an empty draw for an empty pool', () => {
    expect(randomDraw([])).toEqual([])
  })
})

describe('discardAndRedraw', () => {
  it('permanently excludes the discarded stick and draws one replacement', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 10)
    const drawnFive = randomDraw(sticks)
    let session = createSelectionSession(pool.id)
    session = { ...session, drawnStickIds: drawnFive.map((s) => s.id) }

    const toDiscard = drawnFive[0].id
    const result = discardAndRedraw(session, sticks, toDiscard)

    expect(result.discardedStickIds).toContain(toDiscard)
    expect(result.drawnStickIds).not.toContain(toDiscard)
    expect(result.drawnStickIds).toHaveLength(5)
  })

  it('never redraws a stick discarded earlier in the same session', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 6)
    let session = createSelectionSession(pool.id)
    session = { ...session, drawnStickIds: sticks.slice(0, 5).map((s) => s.id) }

    // Discard repeatedly and confirm the discarded id never reappears.
    session = discardAndRedraw(session, sticks, sticks[0].id)
    session = discardAndRedraw(session, sticks, sticks[1].id)

    expect(session.drawnStickIds).not.toContain(sticks[0].id)
    expect(session.drawnStickIds).not.toContain(sticks[1].id)
    expect(session.discardedStickIds).toEqual(expect.arrayContaining([sticks[0].id, sticks[1].id]))
  })

  it('shrinks the drawn set with no redraw once every eligible stick is exhausted', () => {
    const pool = createPool('Dinner')
    const sticks = makeSticks(pool.id, 1)
    let session = createSelectionSession(pool.id)
    session = { ...session, drawnStickIds: [sticks[0].id] }

    const result = discardAndRedraw(session, sticks, sticks[0].id)

    expect(result.drawnStickIds).toEqual([])
    expect(result.discardedStickIds).toEqual([sticks[0].id])
  })
})
