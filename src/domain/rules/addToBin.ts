import type { Stick } from '../entities/stick'
import type { WeeklyBin } from '../entities/weeklyBin'
import { getSticksNotInBin } from './replace'

/** Same candidate set as Replace — pool sticks not currently active or done (§4.4a, §6.8). */
export function getAddCandidates(poolSticks: Stick[], bin: WeeklyBin): Stick[] {
  return getSticksNotInBin(poolSticks, bin)
}

/**
 * Appends to activeStickIds without removing anything — not subject to the 5-cap,
 * which only bounds the initial random draw (§4.4a, §6.8). No-op if the stick is
 * already in the bin (defense in depth; callers should only offer real candidates).
 */
export function addStickToBin(bin: WeeklyBin, stickId: string): WeeklyBin {
  if (bin.activeStickIds.includes(stickId) || bin.doneStickIds.includes(stickId)) {
    return bin
  }
  return {
    ...bin,
    activeStickIds: [...bin.activeStickIds, stickId],
    updatedAt: Date.now(),
  }
}
