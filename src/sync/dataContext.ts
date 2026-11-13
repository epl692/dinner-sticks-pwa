import type { SyncCore, SyncableObject } from '@sync/core'

/**
 * Where the repositories read and write: one sync core plus the family Space that holds
 * every pool, stick and bin. Set once the user has created or joined a family; tests set
 * it directly with an in-memory core.
 */
export interface DataContext {
  core: SyncCore
  space: string
}

let current: DataContext | null = null

export function setDataContext(ctx: DataContext | null): void {
  current = ctx
}

export function getDataContext(): DataContext {
  if (!current) throw new Error('No family is open yet: the sync data context is not set')
  return current
}

export function hasDataContext(): boolean {
  return current !== null
}

/** Object types stored in the family Space. */
export const TYPE = {
  pool: 'dinner.pool',
  stick: 'dinner.stick',
  bin: 'dinner.bin',
  binItem: 'dinner.binItem',
} as const

export async function listObjects(type: string): Promise<SyncableObject[]> {
  const { core, space } = getDataContext()
  return core.query({ space, type }).once()
}

/**
 * Calls `onChange` (debounced) whenever anything in the family Space changes, whether the
 * change was made on this device or arrived from another one. The first, immediate emission
 * of the live query is skipped: callers load their initial state themselves.
 */
export function watchLibrary(onChange: () => void, debounceMs = 60): () => void {
  const { core, space } = getDataContext()
  let first = true
  let timer: ReturnType<typeof setTimeout> | undefined
  const stop = core.query({ space }).subscribe(() => {
    if (first) {
      first = false
      return
    }
    clearTimeout(timer)
    timer = setTimeout(onChange, debounceMs)
  })
  return () => {
    clearTimeout(timer)
    stop()
  }
}
