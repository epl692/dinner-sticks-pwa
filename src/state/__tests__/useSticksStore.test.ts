import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../data/db'
import { useSticksStore } from '../useSticksStore'

const initialState = useSticksStore.getState()

beforeEach(async () => {
  useSticksStore.setState(initialState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('useSticksStore', () => {
  it('loads sticks scoped to the given pool', async () => {
    await useSticksStore.getState().loadForPool('pool-1')
    expect(useSticksStore.getState().sticks).toEqual([])
    expect(useSticksStore.getState().poolId).toBe('pool-1')
  })

  it('adds a stick, persists it, and rejects blank names', async () => {
    await useSticksStore.getState().loadForPool('pool-1')

    const blank = await useSticksStore.getState().addStick('   ')
    expect(blank).toEqual({ ok: false, error: 'empty' })

    const result = await useSticksStore.getState().addStick('Tacos')
    expect(result).toEqual({ ok: true })
    expect(useSticksStore.getState().sticks.map((s) => s.name)).toEqual(['Tacos'])

    const reloaded = await db.sticks.toArray()
    expect(reloaded).toHaveLength(1)
  })

  it('rejects a case-insensitive duplicate name within the pool', async () => {
    await useSticksStore.getState().loadForPool('pool-1')
    await useSticksStore.getState().addStick('Tacos')

    const result = await useSticksStore.getState().addStick('tacos')
    expect(result).toEqual({ ok: false, error: 'duplicate' })
    expect(useSticksStore.getState().sticks).toHaveLength(1)
  })

  it('renames a stick, applying the same validation', async () => {
    await useSticksStore.getState().loadForPool('pool-1')
    await useSticksStore.getState().addStick('Tacos')
    const [stick] = useSticksStore.getState().sticks

    const result = await useSticksStore.getState().renameStick(stick.id, 'Burritos')
    expect(result).toEqual({ ok: true })
    expect(useSticksStore.getState().sticks[0].name).toBe('Burritos')
  })

  it('deletes a stick', async () => {
    await useSticksStore.getState().loadForPool('pool-1')
    await useSticksStore.getState().addStick('Tacos')
    const [stick] = useSticksStore.getState().sticks

    await useSticksStore.getState().deleteStick(stick.id)
    expect(useSticksStore.getState().sticks).toEqual([])
  })
})
