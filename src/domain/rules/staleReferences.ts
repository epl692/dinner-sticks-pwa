import type { Stick } from '../entities/stick'
import type { WeeklyBin } from '../entities/weeklyBin'

/**
 * A bin may reference a stick no longer present in its pool (deleted while still
 * in the bin). Such references are filtered out on read, never cleaned up (§6.5).
 */
function filterDisplayable(stickIds: string[], poolSticks: Stick[]): Stick[] {
  const stickById = new Map(poolSticks.map((s) => [s.id, s]))
  return stickIds.map((id) => stickById.get(id)).filter((s): s is Stick => s !== undefined)
}

export function filterActiveDisplayable(bin: WeeklyBin, poolSticks: Stick[]): Stick[] {
  return filterDisplayable(bin.activeStickIds, poolSticks)
}

export function filterDoneDisplayable(bin: WeeklyBin, poolSticks: Stick[]): Stick[] {
  return filterDisplayable(bin.doneStickIds, poolSticks)
}
