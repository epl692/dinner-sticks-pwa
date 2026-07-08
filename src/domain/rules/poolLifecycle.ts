import { createPool, type Pool } from '../entities/pool'

export const DEFAULT_POOL_NAME = 'Dinner'

/**
 * Deleting the only remaining pool creates a fresh empty "Dinner" pool as part of
 * the same operation, so the app is never left with zero pools (§6.7).
 */
export function deletePoolWithSafeguard(pools: Pool[], poolIdToDelete: string): Pool[] {
  const remaining = pools.filter((p) => p.id !== poolIdToDelete)
  if (remaining.length === 0) {
    return [createPool(DEFAULT_POOL_NAME)]
  }
  return remaining
}
