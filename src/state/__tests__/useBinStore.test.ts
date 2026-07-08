import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { useBinStore } from '../useBinStore'
import { useSticksStore } from '../useSticksStore'

const initialBinState = useBinStore.getState()
const initialSticksState = useSticksStore.getState()
const POOL_ID = 'pool-1'

beforeEach(async () => {
  useBinStore.setState(initialBinState, true)
  useSticksStore.setState(initialSticksState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

async function seedSticks(names: string[]) {
  for (const name of names) {
    await useSticksStore.getState().addStick(name)
  }
}

describe('useBinStore', () => {
  it('confirmDraw persists a new bin for the pool', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos', 'Soup'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const stickIds = useSticksStore.getState().sticks.map((s) => s.id)

    await useBinStore.getState().confirmDraw(stickIds)

    expect(useBinStore.getState().bin?.activeStickIds).toEqual(stickIds)
    expect(await db.weeklyBins.count()).toBe(1)
  })

  it('confirmDraw replaces a prior bin for the same pool rather than creating a second one', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos', 'Soup', 'Pizza'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const [a, b, c] = useSticksStore.getState().sticks

    await useBinStore.getState().confirmDraw([a.id])
    await useBinStore.getState().confirmDraw([b.id, c.id])

    expect(useBinStore.getState().bin?.activeStickIds).toEqual([b.id, c.id])
    expect(await db.weeklyBins.count()).toBe(1)
  })

  it('markDone is idempotent through the store', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const [stick] = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw([stick.id])

    await useBinStore.getState().markDone(stick.id)
    await useBinStore.getState().markDone(stick.id)

    expect(useBinStore.getState().bin?.activeStickIds).toEqual([])
    expect(useBinStore.getState().bin?.doneStickIds).toEqual([stick.id])
  })

  it('addStick grows the bin uncapped, using the shared candidate set', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['A', 'B', 'C', 'D', 'E', 'F'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const sticks = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw(sticks.slice(0, 5).map((s) => s.id))

    expect(useBinStore.getState().getAddCandidates()).toEqual([sticks[5]])

    await useBinStore.getState().addStick(sticks[5].id)

    expect(useBinStore.getState().bin?.activeStickIds).toHaveLength(6)
  })

  it('replaceRandom returns false and leaves the bin unchanged with no candidates', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const [stick] = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw([stick.id])

    const result = await useBinStore.getState().replaceRandom(stick.id)

    expect(result).toBe(false)
    expect(useBinStore.getState().bin?.activeStickIds).toEqual([stick.id])
  })

  it('removeStick drops without replacement, leaving the pool stick list intact', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const [stick] = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw([stick.id])

    await useBinStore.getState().removeStick(stick.id)

    expect(useBinStore.getState().bin?.activeStickIds).toEqual([])
    expect(useSticksStore.getState().sticks).toHaveLength(1)
  })

  it('reflects stale references by omission once a stick is deleted from the pool', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos', 'Pizza'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const [tacos, pizza] = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw([tacos.id, pizza.id])

    await useSticksStore.getState().deleteStick(pizza.id)

    // The bin itself still references pizza (never cleaned up)...
    expect(useBinStore.getState().bin?.activeStickIds).toContain(pizza.id)
    // ...but it's no longer a live pool stick, so filtering (staleReferences.ts,
    // exercised via the UI layer in Phase 5) would exclude it on display.
    expect(useSticksStore.getState().sticks.map((s) => s.id)).not.toContain(pizza.id)
  })

  it('replaceWithChoice swaps in exactly the chosen stick', async () => {
    await useSticksStore.getState().loadForPool(POOL_ID)
    await seedSticks(['Tacos', 'Soup'])
    await useBinStore.getState().loadForPool(POOL_ID)
    const [tacos, soup] = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw([tacos.id])

    await useBinStore.getState().replaceWithChoice(tacos.id, soup.id)

    expect(useBinStore.getState().bin?.activeStickIds).toEqual([soup.id])
  })
})
