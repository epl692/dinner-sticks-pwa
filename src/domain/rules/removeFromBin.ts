import type { WeeklyBin } from '../entities/weeklyBin'

/** Drops the stick from active or done without any replacement; pool is untouched (§4.4). */
export function removeStickFromBin(bin: WeeklyBin, stickId: string): WeeklyBin {
  return {
    ...bin,
    activeStickIds: bin.activeStickIds.filter((id) => id !== stickId),
    doneStickIds: bin.doneStickIds.filter((id) => id !== stickId),
    updatedAt: Date.now(),
  }
}
