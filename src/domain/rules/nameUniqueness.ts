import type { Pool } from '../entities/pool'
import type { Stick } from '../entities/stick'

export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

export function isNonEmptyName(name: string): boolean {
  return name.trim().length > 0
}

/** Pool names are unique case-insensitively across all pools (§6.6). */
export function isPoolNameUnique(name: string, pools: Pool[], excludeId?: string): boolean {
  const normalized = normalizeName(name)
  return !pools.some((p) => p.id !== excludeId && normalizeName(p.name) === normalized)
}

/** Stick names are unique case-insensitively within their own pool only (§6.6). */
export function isStickNameUnique(
  name: string,
  sticksInSamePool: Stick[],
  excludeId?: string,
): boolean {
  const normalized = normalizeName(name)
  return !sticksInSamePool.some((s) => s.id !== excludeId && normalizeName(s.name) === normalized)
}
