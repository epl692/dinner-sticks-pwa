import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { useSelectionSessionStore } from '../useSelectionSessionStore'
import { useSticksStore } from '../useSticksStore'

const initialSessionState = useSelectionSessionStore.getState()
const initialSticksState = useSticksStore.getState()
const POOL_ID = 'pool-1'

beforeEach(async () => {
  useSelectionSessionStore.setState(initialSessionState, true)
  useSticksStore.setState(initialSticksState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

async function seedSticks(names: string[]) {
  await useSticksStore.getState().loadForPool(POOL_ID)
  for (const name of names) {
    await useSticksStore.getState().addStick(name)
  }
}

describe('useSelectionSessionStore', () => {
  it('refuses to start a draw on an empty pool', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    const result = useSelectionSessionStore.getState().start(POOL_ID)
    expect(result).toEqual({ ok: false, error: 'empty_pool' })
    expect(useSelectionSessionStore.getState().session).toBeNull()
  })

  it('draws up to 5 sticks and flags a reduced count when the pool has fewer', async () => {
    await seedSticks(['A', 'B', 'C'])
    const result = useSelectionSessionStore.getState().start(POOL_ID)

    expect(result).toEqual({ ok: true })
    expect(useSelectionSessionStore.getState().drawnSticks()).toHaveLength(3)
    expect(useSelectionSessionStore.getState().reducedCount).toBe(3)
  })

  it('does not flag a reduced count when the pool has 5 or more', async () => {
    await seedSticks(['A', 'B', 'C', 'D', 'E', 'F'])
    useSelectionSessionStore.getState().start(POOL_ID)

    expect(useSelectionSessionStore.getState().drawnSticks()).toHaveLength(5)
    expect(useSelectionSessionStore.getState().reducedCount).toBeNull()
  })

  it('discard permanently excludes a stick and redraws from what remains', async () => {
    await seedSticks(['A', 'B', 'C', 'D', 'E', 'F'])
    useSelectionSessionStore.getState().start(POOL_ID)
    const toDiscard = useSelectionSessionStore.getState().drawnSticks()[0].id

    useSelectionSessionStore.getState().discard(toDiscard)

    expect(useSelectionSessionStore.getState().drawnSticks().map((s) => s.id)).not.toContain(
      toDiscard,
    )
    expect(useSelectionSessionStore.getState().drawnSticks()).toHaveLength(5)
  })

  it('hasEligibleRemaining reflects whether any pool stick is still drawable', async () => {
    await seedSticks(['A'])
    useSelectionSessionStore.getState().start(POOL_ID)
    const only = useSelectionSessionStore.getState().drawnSticks()[0].id

    expect(useSelectionSessionStore.getState().hasEligibleRemaining()).toBe(false)

    useSelectionSessionStore.getState().discard(only)
    expect(useSelectionSessionStore.getState().hasEligibleRemaining()).toBe(false)
    expect(useSelectionSessionStore.getState().drawnSticks()).toEqual([])
  })

  it('end() clears the session entirely with no persistence involved', async () => {
    await seedSticks(['A'])
    useSelectionSessionStore.getState().start(POOL_ID)

    useSelectionSessionStore.getState().end()

    expect(useSelectionSessionStore.getState().session).toBeNull()
    expect(useSelectionSessionStore.getState().reducedCount).toBeNull()
  })
})
