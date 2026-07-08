import type { Stick } from '../entities/stick'
import type { WeeklyBin } from '../entities/weeklyBin'

/** Pool sticks not currently in the bin (active or done) — the shared candidate set
 * used by both Replace's Pick-one mode and the Add action (§6.3, §6.8). */
export function getSticksNotInBin(poolSticks: Stick[], bin: WeeklyBin): Stick[] {
  const inBin = new Set([...bin.activeStickIds, ...bin.doneStickIds])
  return poolSticks.filter((s) => !inBin.has(s.id))
}

export function getReplaceCandidates(poolSticks: Stick[], bin: WeeklyBin): Stick[] {
  return getSticksNotInBin(poolSticks, bin)
}

function replaceStickInBin(bin: WeeklyBin, stickIdToReplace: string, replacementId: string): WeeklyBin {
  const index = bin.activeStickIds.indexOf(stickIdToReplace)
  if (index === -1) return bin
  const activeStickIds = [...bin.activeStickIds]
  activeStickIds[index] = replacementId
  return { ...bin, activeStickIds, updatedAt: Date.now() }
}

/** "Random" mode: draws uniformly from candidates. Returns null if none available (§4.4). */
export function replaceRandomCandidate(
  poolSticks: Stick[],
  bin: WeeklyBin,
  stickIdToReplace: string,
): WeeklyBin | null {
  const candidates = getReplaceCandidates(poolSticks, bin)
  if (candidates.length === 0) return null
  const replacement = candidates[Math.floor(Math.random() * candidates.length)]
  return replaceStickInBin(bin, stickIdToReplace, replacement.id)
}

/** "Pick one" mode: caller has already chosen a candidate from getReplaceCandidates. */
export function replaceWithChoice(
  bin: WeeklyBin,
  stickIdToReplace: string,
  chosenStickId: string,
): WeeklyBin {
  return replaceStickInBin(bin, stickIdToReplace, chosenStickId)
}
