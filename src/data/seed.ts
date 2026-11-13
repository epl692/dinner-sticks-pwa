import { createPool } from '../domain/entities/pool'
import { DEFAULT_POOL_NAME } from '../domain/rules/poolLifecycle'
import { addPool, getAllPools } from './repositories/poolRepository'

/** A fresh family starts with exactly one empty pool named "Dinner" (§3). */
export async function seedIfEmpty(): Promise<void> {
  if ((await getAllPools()).length === 0) {
    await addPool(createPool(DEFAULT_POOL_NAME))
  }
}
