export const LIBRARY_SCHEMA_VERSION = 1

export interface LibraryFilePool {
  name: string
}

export interface LibraryFileStick {
  poolName: string
  name: string
}

export interface LibraryFile {
  schemaVersion: number
  pools: LibraryFilePool[]
  sticks: LibraryFileStick[]
}

/** Structural shape check only — business rules (no-pools, duplicates) live in importLibrary.ts. */
export function isLibraryFileShape(value: unknown): value is LibraryFile {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  if (typeof candidate.schemaVersion !== 'number') return false
  if (!Array.isArray(candidate.pools) || !Array.isArray(candidate.sticks)) return false

  const poolsValid = candidate.pools.every(
    (p): p is LibraryFilePool =>
      typeof p === 'object' && p !== null && typeof (p as { name?: unknown }).name === 'string',
  )
  if (!poolsValid) return false

  return candidate.sticks.every(
    (s): s is LibraryFileStick =>
      typeof s === 'object' &&
      s !== null &&
      typeof (s as { name?: unknown }).name === 'string' &&
      typeof (s as { poolName?: unknown }).poolName === 'string',
  )
}
