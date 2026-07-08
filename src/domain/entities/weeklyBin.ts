export interface WeeklyBin {
  id: string
  poolId: string
  /** Ordered; may exceed 5 entries once the user has used the Add action (§4.4a). */
  activeStickIds: string[]
  /** Disjoint from activeStickIds. */
  doneStickIds: string[]
  createdAt: number
  updatedAt: number
}

export function createWeeklyBin(poolId: string, activeStickIds: string[]): WeeklyBin {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    poolId,
    activeStickIds: [...activeStickIds],
    doneStickIds: [],
    createdAt: now,
    updatedAt: now,
  }
}
