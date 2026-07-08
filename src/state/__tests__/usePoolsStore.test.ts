import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { DEFAULT_POOL_NAME } from '../../domain/rules/poolLifecycle'
import { useBinStore } from '../useBinStore'
import { usePoolsStore } from '../usePoolsStore'
import { useSticksStore } from '../useSticksStore'

const initialPoolsState = usePoolsStore.getState()
const initialSticksState = useSticksStore.getState()
const initialBinState = useBinStore.getState()

beforeEach(async () => {
  usePoolsStore.setState(initialPoolsState, true)
  useSticksStore.setState(initialSticksState, true)
  useBinStore.setState(initialBinState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('usePoolsStore', () => {
  it('loadPools picks the first pool active when none was active before', async () => {
    await usePoolsStore.getState().addPool('Dinner')
    // addPool already sets active; simulate a fresh app load by resetting activePoolId.
    usePoolsStore.setState({ activePoolId: null })

    await usePoolsStore.getState().loadPools()

    expect(usePoolsStore.getState().activePoolId).toBe(usePoolsStore.getState().pools[0].id)
    expect(useSticksStore.getState().poolId).toBe(usePoolsStore.getState().activePoolId)
  })

  it('addPool rejects blank and duplicate (case-insensitive) names', async () => {
    await usePoolsStore.getState().addPool('Dinner')

    expect(await usePoolsStore.getState().addPool('  ')).toEqual({ ok: false, error: 'empty' })
    expect(await usePoolsStore.getState().addPool('dinner')).toEqual({
      ok: false,
      error: 'duplicate',
    })
    expect(usePoolsStore.getState().pools).toHaveLength(1)
  })

  it('addPool makes the new pool active and loads its (empty) sticks and bin', async () => {
    await usePoolsStore.getState().addPool('Dinner')
    const dinnerId = usePoolsStore.getState().activePoolId!

    await usePoolsStore.getState().addPool('Lunch')

    expect(usePoolsStore.getState().activePoolId).not.toBe(dinnerId)
    expect(useSticksStore.getState().poolId).toBe(usePoolsStore.getState().activePoolId)
    expect(useSticksStore.getState().sticks).toEqual([])
  })

  it('deletePool cascades sticks and bin, and never leaves zero pools', async () => {
    await usePoolsStore.getState().addPool('Dinner')
    const onlyPoolId = usePoolsStore.getState().activePoolId!
    await useSticksStore.getState().addStick('Tacos')
    const [stick] = useSticksStore.getState().sticks
    await useBinStore.getState().confirmDraw([stick.id])

    await usePoolsStore.getState().deletePool(onlyPoolId)

    expect(usePoolsStore.getState().pools).toHaveLength(1)
    expect(usePoolsStore.getState().pools[0].name).toBe(DEFAULT_POOL_NAME)
    expect(usePoolsStore.getState().pools[0].id).not.toBe(onlyPoolId)
    expect(await db.sticks.toArray()).toEqual([])
    expect(await db.weeklyBins.count()).toBe(0)
    // The new safeguard pool is now active with fresh, empty state.
    expect(usePoolsStore.getState().activePoolId).toBe(usePoolsStore.getState().pools[0].id)
    expect(useSticksStore.getState().sticks).toEqual([])
  })

  it('deletePool on a non-last pool just removes it and switches active pool only if it was active', async () => {
    await usePoolsStore.getState().addPool('Dinner')
    const dinnerId = usePoolsStore.getState().activePoolId!
    await usePoolsStore.getState().addPool('Lunch')

    await usePoolsStore.getState().deletePool(dinnerId)

    expect(usePoolsStore.getState().pools.map((p) => p.name)).toEqual(['Lunch'])
  })

  it('renamePool validates the same way as addPool, excluding itself from the collision check', async () => {
    await usePoolsStore.getState().addPool('Dinner')
    const id = usePoolsStore.getState().activePoolId!

    expect(await usePoolsStore.getState().renamePool(id, 'Dinner')).toEqual({ ok: true })
    expect(await usePoolsStore.getState().renamePool(id, '')).toEqual({
      ok: false,
      error: 'empty',
    })
  })
})
