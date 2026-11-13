import type { Pool } from '../../domain/entities/pool'
import type { Stick } from '../../domain/entities/stick'
import { getDataContext, listObjects, TYPE } from '../../sync/dataContext'
import { addPool } from './poolRepository'
import { addStick } from './stickRepository'
import { deleteAllBins } from './weeklyBinRepository'

/**
 * Import is all-or-nothing in intent (§4.6, §6.9): the file is fully validated before this is
 * called, then every pool, stick and bin in the family is removed and the imported pools/sticks
 * written. Bins are cleared, not left dangling, since the sticks they reference no longer exist.
 *
 * The family Space has no multi-object transaction, so this is a sequence of local writes that
 * then sync as one batch of changes. Every step is a local write that cannot fail on validation
 * grounds; if the device is interrupted midway, running the import again finishes the job.
 */
export async function replaceLibrary(pools: Pool[], sticks: Stick[]): Promise<void> {
  const { core } = getDataContext()
  await deleteAllBins()
  for (const o of await listObjects(TYPE.stick)) await core.remove(o.id)
  for (const o of await listObjects(TYPE.pool)) await core.remove(o.id)
  for (const pool of pools) await addPool(pool)
  for (const stick of sticks) await addStick(stick)
}
