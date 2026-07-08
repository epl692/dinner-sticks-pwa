import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { isNonEmptyName, isPoolNameUnique, isStickNameUnique, normalizeName } from '../rules/nameUniqueness'

describe('normalizeName', () => {
  it('trims and lowercases', () => {
    expect(normalizeName('  Dinner  ')).toBe('dinner')
  })
})

describe('isNonEmptyName', () => {
  it('rejects blank and whitespace-only names', () => {
    expect(isNonEmptyName('')).toBe(false)
    expect(isNonEmptyName('   ')).toBe(false)
  })

  it('accepts a real name', () => {
    expect(isNonEmptyName('Tacos')).toBe(true)
  })
})

describe('isPoolNameUnique', () => {
  it('is case-insensitive across all pools', () => {
    const pools = [createPool('Dinner')]
    expect(isPoolNameUnique('dinner', pools)).toBe(false)
    expect(isPoolNameUnique('DINNER', pools)).toBe(false)
    expect(isPoolNameUnique('Lunch', pools)).toBe(true)
  })

  it('excludes the entity being renamed from the collision check', () => {
    const pool = createPool('Dinner')
    expect(isPoolNameUnique('Dinner', [pool], pool.id)).toBe(true)
  })
})

describe('isStickNameUnique', () => {
  it('checks case-insensitive collision within the given (already pool-scoped) list', () => {
    const poolA = createPool('Dinner')
    const stickInA = createStick(poolA.id, 'Tacos')
    expect(isStickNameUnique('tacos', [stickInA])).toBe(false)
    expect(isStickNameUnique('Tacos', [stickInA], stickInA.id)).toBe(true)
  })

  it('is scoped to sticks within the same pool only — callers pre-filter by poolId, so the same name in a different pool never collides', () => {
    const poolA = createPool('Dinner')
    const poolB = createPool('Lunch')
    const stickInB = createStick(poolB.id, 'Tacos')

    // Caller filters candidates to poolA's sticks before calling; stickInB never
    // enters that list, so a same-named stick in poolB can never collide with poolA.
    const sticksInPoolA = [stickInB].filter((s) => s.poolId === poolA.id)
    expect(isStickNameUnique('Tacos', sticksInPoolA)).toBe(true)
  })
})
