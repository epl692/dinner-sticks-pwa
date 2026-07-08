import type { WeeklyBin } from '../entities/weeklyBin'

/** Idempotent: always ends with the stick in doneStickIds and out of activeStickIds (§6.4). */
export function markStickDone(bin: WeeklyBin, stickId: string): WeeklyBin {
  const activeStickIds = bin.activeStickIds.filter((id) => id !== stickId)
  const doneStickIds = bin.doneStickIds.includes(stickId)
    ? bin.doneStickIds
    : [...bin.doneStickIds, stickId]
  return { ...bin, activeStickIds, doneStickIds, updatedAt: Date.now() }
}
