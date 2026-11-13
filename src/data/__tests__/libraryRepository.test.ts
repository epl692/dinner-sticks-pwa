import { beforeEach, describe, expect, it } from 'vitest'
import { createPool } from '../../domain/entities/pool'
import { createStick } from '../../domain/entities/stick'
import { createWeeklyBin } from '../../domain/entities/weeklyBin'
import { testDb as db } from '../../test/testData'
import { replaceLibrary } from '../repositories/libraryRepository'
import { addPool } from '../repositories/poolRepository'
import { addStick } from '../repositories/stickRepository'
import { upsertBin } from '../repositories/weeklyBinRepository'

beforeEach(async () => {
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('replaceLibrary', () => {
  it('wipes existing pools, sticks, and bins and installs the new ones', async () => {
    const oldPool = createPool('Dinner')
    await addPool(oldPool)
    const oldStick = createStick(oldPool.id, 'Tacos')
    await addStick(oldStick)
    await upsertBin(createWeeklyBin(oldPool.id, [oldStick.id]))

    const newPool = createPool('Breakfast')
    const newStick = createStick(newPool.id, 'Pancakes')
    await replaceLibrary([newPool], [newStick])

    expect(await db.pools.toArray()).toHaveLength(1)
    expect((await db.pools.toArray())[0].name).toBe('Breakfast')
    expect(await db.sticks.toArray()).toHaveLength(1)
    expect(await db.weeklyBins.count()).toBe(0)
  })

  // The family Space has no multi-object transaction. All-or-nothing validation happens before replaceLibrary is
  // called (useImportExportStore); what storage guarantees is that re-running a replace converges on the file.
  it('can be re-run after an interruption and ends with exactly the imported library', async () => {
    const existingPool = createPool('Dinner')
    await addPool(existingPool)
    await addStick(createStick(existingPool.id, 'Tacos'))

    // Each import builds its plan with fresh ids (buildReplacePlan), and a deleted id is never reused.
    const firstPool = createPool('Breakfast')
    await replaceLibrary([firstPool], [createStick(firstPool.id, 'Pancakes')])
    const newPool = createPool('Breakfast')
    const newStick = createStick(newPool.id, 'Pancakes')
    await replaceLibrary([newPool], [newStick])

    expect(await db.pools.toArray()).toEqual([newPool])
    expect(await db.sticks.toArray()).toEqual([newStick])
  })
})
