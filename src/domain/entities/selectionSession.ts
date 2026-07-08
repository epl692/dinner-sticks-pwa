export const MAX_DRAW_SIZE = 5

/** Transient, never persisted (§3, §7) — exists only while the draw screen is open. */
export interface SelectionSession {
  poolId: string
  drawnStickIds: string[]
  discardedStickIds: string[]
}

export function createSelectionSession(poolId: string): SelectionSession {
  return {
    poolId,
    drawnStickIds: [],
    discardedStickIds: [],
  }
}
