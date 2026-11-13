import { describe, expect, it } from 'vitest'
import type { SyncCore } from '@sync/core'
import { createPool } from '../../domain/entities/pool'
import { createStick } from '../../domain/entities/stick'
import { createWeeklyBin } from '../../domain/entities/weeklyBin'
import { markStickDone } from '../../domain/rules/markDone'
import { addStickToBin } from '../../domain/rules/addToBin'
import { createLink } from '../../test/linkedTransports'
import { createTestCore, TEST_SPACE } from '../../test/testData'
import { setDataContext } from '../../sync/dataContext'
import { addPool, getAllPools } from '../repositories/poolRepository'
import { addStick, getSticksForPool } from '../repositories/stickRepository'
import { getBinForPool, replaceBinForPool, upsertBin } from '../repositories/weeklyBinRepository'

/** Two "devices" of one family. Everything runs against the repositories, switching which device is current. */
async function twoDevices() {
  const a = await createTestCore('devicea')
  const b = await createTestCore('deviceb')
  const link = createLink()
  a.addTransport(link.a)
  b.addTransport(link.b)
  const on = (core: SyncCore) => setDataContext({ core, space: TEST_SPACE })
  const settle = async () => {
    link.up()
    await new Promise((r) => setTimeout(r, 50))
  }
  return { a, b, on, settle, offline: () => link.down() }
}

describe('two devices in one family', () => {
  it('shows a pool and its sticks made on one device on the other', async () => {
    const d = await twoDevices()
    d.on(d.a)
    const pool = createPool('Dinner')
    await addPool(pool)
    await addStick(createStick(pool.id, 'Tacos'))
    await d.settle()

    d.on(d.b)
    expect((await getAllPools()).map((p) => p.name)).toEqual(['Dinner'])
    expect((await getSticksForPool(pool.id)).map((s) => s.name)).toEqual(['Tacos'])
  })

  it('keeps both meals when each device adds one to the same week while offline', async () => {
    const d = await twoDevices()
    d.on(d.a)
    const pool = createPool('Dinner')
    await addPool(pool)
    const sticks = ['Tacos', 'Soup', 'Pasta', 'Pizza'].map((n) => createStick(pool.id, n))
    for (const s of sticks) await addStick(s)
    const bin = createWeeklyBin(pool.id, [sticks[0].id])
    await replaceBinForPool(bin)
    await d.settle()
    d.offline()

    d.on(d.a)
    await upsertBin(addStickToBin(bin, sticks[1].id))
    d.on(d.b)
    const seenOnB = (await getBinForPool(pool.id))!
    await upsertBin(addStickToBin(seenOnB, sticks[2].id))

    await d.settle()
    for (const core of [d.a, d.b]) {
      d.on(core)
      const merged = (await getBinForPool(pool.id))!
      expect([...merged.activeStickIds].sort()).toEqual(
        [sticks[0].id, sticks[1].id, sticks[2].id].sort(),
      )
    }
  })

  it('lets one device mark done while the other removes a different meal', async () => {
    const d = await twoDevices()
    d.on(d.a)
    const pool = createPool('Dinner')
    await addPool(pool)
    const [s1, s2] = ['Tacos', 'Soup'].map((n) => createStick(pool.id, n))
    await addStick(s1)
    await addStick(s2)
    const bin = createWeeklyBin(pool.id, [s1.id, s2.id])
    await replaceBinForPool(bin)
    await d.settle()
    d.offline()

    d.on(d.a)
    await upsertBin(markStickDone((await getBinForPool(pool.id))!, s1.id))
    d.on(d.b)
    const b = (await getBinForPool(pool.id))!
    await upsertBin({ ...b, activeStickIds: b.activeStickIds.filter((id) => id !== s2.id) })
    await d.settle()

    d.on(d.a)
    const merged = (await getBinForPool(pool.id))!
    expect(merged.activeStickIds).toEqual([])
    expect(merged.doneStickIds).toEqual([s1.id])
  })

  it('ends with a single bin when both devices confirm a new draw at once', async () => {
    const d = await twoDevices()
    d.on(d.a)
    const pool = createPool('Dinner')
    await addPool(pool)
    const sticks = ['Tacos', 'Soup'].map((n) => createStick(pool.id, n))
    for (const s of sticks) await addStick(s)
    await d.settle()
    d.offline()

    d.on(d.a)
    await replaceBinForPool(createWeeklyBin(pool.id, [sticks[0].id]))
    d.on(d.b)
    await replaceBinForPool(createWeeklyBin(pool.id, [sticks[1].id]))
    await d.settle()

    d.on(d.a)
    const onA = await getBinForPool(pool.id)
    d.on(d.b)
    const onB = await getBinForPool(pool.id)
    expect(onA?.id).toBe(onB?.id)
    expect(onA?.activeStickIds).toEqual(onB?.activeStickIds)
    expect(onA?.activeStickIds).toHaveLength(1)
  })
})
