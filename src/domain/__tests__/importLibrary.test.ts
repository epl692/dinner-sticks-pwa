import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { serializeLibrary } from '../io/exportLibrary'
import { buildReplacePlan, validateLibraryFile } from '../io/importLibrary'
import { LIBRARY_SCHEMA_VERSION } from '../io/librarySchema'

describe('validateLibraryFile', () => {
  it('accepts a well-formed file', () => {
    const result = validateLibraryFile({
      schemaVersion: LIBRARY_SCHEMA_VERSION,
      pools: [{ name: 'Dinner' }],
      sticks: [{ poolName: 'Dinner', name: 'Tacos' }],
    })
    expect(result).toEqual({ valid: true, errors: [] })
  })

  it('round-trips a real export back through validation successfully', () => {
    const dinner = createPool('Dinner')
    const tacos = createStick(dinner.id, 'Tacos')
    const file = serializeLibrary([dinner], [tacos])

    expect(validateLibraryFile(file).valid).toBe(true)
  })

  it.each([
    ['not an object', null],
    ['a plain string', 'hello'],
    ['missing schemaVersion', { pools: [], sticks: [] }],
    ['pools not an array', { schemaVersion: 1, pools: {}, sticks: [] }],
    ['sticks not an array', { schemaVersion: 1, pools: [], sticks: {} }],
    ['a pool missing name', { schemaVersion: 1, pools: [{}], sticks: [] }],
    [
      'a stick missing poolName',
      { schemaVersion: 1, pools: [{ name: 'Dinner' }], sticks: [{ name: 'Tacos' }] },
    ],
  ])('rejects malformed shape: %s', (_label, input) => {
    const result = validateLibraryFile(input)
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('invalid_shape')
  })

  it('rejects a file with zero pools', () => {
    const result = validateLibraryFile({ schemaVersion: 1, pools: [], sticks: [] })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('no_pools')
  })

  it('rejects duplicate pool names, case-insensitively', () => {
    const result = validateLibraryFile({
      schemaVersion: 1,
      pools: [{ name: 'Dinner' }, { name: 'dinner' }],
      sticks: [],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('duplicate_pool_name')
  })

  it('rejects duplicate stick names within the same pool, case-insensitively', () => {
    const result = validateLibraryFile({
      schemaVersion: 1,
      pools: [{ name: 'Dinner' }],
      sticks: [
        { poolName: 'Dinner', name: 'Tacos' },
        { poolName: 'Dinner', name: 'tacos' },
      ],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('duplicate_stick_name')
  })

  it('allows the same stick name to repeat across different pools', () => {
    const result = validateLibraryFile({
      schemaVersion: 1,
      pools: [{ name: 'Dinner' }, { name: 'Lunch' }],
      sticks: [
        { poolName: 'Dinner', name: 'Tacos' },
        { poolName: 'Lunch', name: 'Tacos' },
      ],
    })
    expect(result.valid).toBe(true)
  })

  it('rejects a stick referencing a pool not present in the file', () => {
    const result = validateLibraryFile({
      schemaVersion: 1,
      pools: [{ name: 'Dinner' }],
      sticks: [{ poolName: 'Breakfast', name: 'Tacos' }],
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('unknown_pool_reference')
  })
})

describe('buildReplacePlan', () => {
  it('mints fresh ids and remaps sticks to their pool by name', () => {
    const plan = buildReplacePlan({
      schemaVersion: 1,
      pools: [{ name: 'Dinner' }, { name: 'Lunch' }],
      sticks: [
        { poolName: 'Dinner', name: 'Tacos' },
        { poolName: 'Lunch', name: 'Soup' },
      ],
    })

    expect(plan.pools).toHaveLength(2)
    expect(plan.sticks).toHaveLength(2)

    const dinnerPool = plan.pools.find((p) => p.name === 'Dinner')!
    const tacos = plan.sticks.find((s) => s.name === 'Tacos')!
    expect(tacos.poolId).toBe(dinnerPool.id)

    // ids must be freshly minted, not reused from anywhere in the input.
    const ids = [...plan.pools.map((p) => p.id), ...plan.sticks.map((s) => s.id)]
    expect(new Set(ids).size).toBe(ids.length)
  })
})
