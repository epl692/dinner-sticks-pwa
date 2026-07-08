import { createPool, type Pool } from '../entities/pool'
import { createStick, type Stick } from '../entities/stick'
import { normalizeName } from '../rules/nameUniqueness'
import { isLibraryFileShape, type LibraryFile } from './librarySchema'

export type LibraryValidationError =
  | 'invalid_shape'
  | 'no_pools'
  | 'duplicate_pool_name'
  | 'duplicate_stick_name'
  | 'unknown_pool_reference'

export interface LibraryValidationResult {
  valid: boolean
  errors: LibraryValidationError[]
}

/**
 * All-or-nothing validation (§4.6, §6.9): shape, at least one pool, no duplicate
 * names (pools globally, sticks within their pool) — the same uniqueness rules
 * that already govern this data (§3) must hold for an imported file too.
 */
export function validateLibraryFile(rawJson: unknown): LibraryValidationResult {
  if (!isLibraryFileShape(rawJson)) {
    return { valid: false, errors: ['invalid_shape'] }
  }

  const errors: LibraryValidationError[] = []

  if (rawJson.pools.length === 0) {
    errors.push('no_pools')
  }

  const seenPoolNames = new Set<string>()
  let hasDuplicatePool = false
  for (const pool of rawJson.pools) {
    const normalized = normalizeName(pool.name)
    if (normalized.length === 0 || seenPoolNames.has(normalized)) {
      hasDuplicatePool = true
      break
    }
    seenPoolNames.add(normalized)
  }
  if (hasDuplicatePool) errors.push('duplicate_pool_name')

  let hasUnknownPoolRef = false
  let hasDuplicateStick = false
  const seenStickNamesByPool = new Map<string, Set<string>>()
  for (const stick of rawJson.sticks) {
    const poolKey = normalizeName(stick.poolName)
    if (!seenPoolNames.has(poolKey)) {
      hasUnknownPoolRef = true
      break
    }
    const seen = seenStickNamesByPool.get(poolKey) ?? new Set<string>()
    const stickKey = normalizeName(stick.name)
    if (stickKey.length === 0 || seen.has(stickKey)) {
      hasDuplicateStick = true
      break
    }
    seen.add(stickKey)
    seenStickNamesByPool.set(poolKey, seen)
  }
  if (hasUnknownPoolRef) errors.push('unknown_pool_reference')
  if (hasDuplicateStick) errors.push('duplicate_stick_name')

  return { valid: errors.length === 0, errors }
}

export interface ReplacePlan {
  pools: Pool[]
  sticks: Stick[]
}

/** Mints fresh local identity for every pool/stick — original ids aren't portable
 * across instances, so the file's pool/stick names are treated as authoritative
 * and sticks are remapped to the newly-minted pool ids by name. Only call this
 * after validateLibraryFile has returned valid: true. */
export function buildReplacePlan(file: LibraryFile): ReplacePlan {
  const pools = file.pools.map((p) => createPool(p.name))
  const poolIdByName = new Map(pools.map((p) => [normalizeName(p.name), p.id]))

  const sticks = file.sticks.map((s) => {
    const poolId = poolIdByName.get(normalizeName(s.poolName))
    if (!poolId) {
      throw new Error(`Import stick references unknown pool "${s.poolName}"`)
    }
    return createStick(poolId, s.name)
  })

  return { pools, sticks }
}
