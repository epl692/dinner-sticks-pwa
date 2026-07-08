import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { DEFAULT_POOL_NAME, deletePoolWithSafeguard } from '../rules/poolLifecycle'

describe('deletePoolWithSafeguard', () => {
  it('removes the pool normally when others remain', () => {
    const a = createPool('Dinner')
    const b = createPool('Lunch')

    const result = deletePoolWithSafeguard([a, b], a.id)

    expect(result).toEqual([b])
  })

  it('auto-creates a fresh empty Dinner pool when deleting the last one', () => {
    const only = createPool('Dinner')

    const result = deletePoolWithSafeguard([only], only.id)

    expect(result).toHaveLength(1)
    expect(result[0].name).toBe(DEFAULT_POOL_NAME)
    expect(result[0].id).not.toBe(only.id)
  })
})
