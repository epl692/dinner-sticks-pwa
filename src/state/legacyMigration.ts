import { getAllPools, addPool } from '../data/repositories/poolRepository'
import { addStick, getAllSticks } from '../data/repositories/stickRepository'
import { getBinForPool, upsertBin } from '../data/repositories/weeklyBinRepository'
import { readLegacyLibrary, type LegacyLibrary } from '../data/legacy/legacyDb'
import { planLegacyMerge } from '../domain/io/mergeLegacy'

const FLAG = 'dinner-sticks:legacy-upload'
type Decision = 'uploaded' | 'declined'

function readFlag(): Decision | null {
  try {
    const v = localStorage.getItem(FLAG)
    return v === 'uploaded' || v === 'declined' ? v : null
  } catch {
    return null
  }
}

function writeFlag(v: Decision): void {
  try {
    localStorage.setItem(FLAG, v)
  } catch {
    // storage blocked: the prompt may show again next launch, which is harmless
  }
}

/**
 * The meal library an older, pre-sync version of the app left in this browser, if any, and whether
 * the person has already dealt with it. The old database is never deleted: it stays as a backup.
 */
export async function findLegacyLibrary(): Promise<{
  library: LegacyLibrary
  decision: Decision | null
} | null> {
  const library = await readLegacyLibrary()
  return library ? { library, decision: readFlag() } : null
}

export function declineLegacyUpload(): void {
  writeFlag('declined')
}

/** Adds the old library to the family without changing or removing anything already there. */
export async function uploadLegacyLibrary(
  library: LegacyLibrary,
): Promise<{ pools: number; sticks: number }> {
  const [existingPools, existingSticks] = await Promise.all([getAllPools(), getAllSticks()])
  const poolsWithBin = new Set<string>()
  for (const pool of existingPools) {
    if (await getBinForPool(pool.id)) poolsWithBin.add(pool.id)
  }
  const plan = planLegacyMerge({ existingPools, existingSticks, poolsWithBin, legacy: library })
  for (const pool of plan.poolsToAdd) await addPool(pool)
  for (const stick of plan.sticksToAdd) await addStick(stick)
  for (const bin of plan.binsToAdd) await upsertBin(bin)
  writeFlag('uploaded')
  return { pools: plan.poolsToAdd.length, sticks: plan.sticksToAdd.length }
}
