import { MAX_DRAW_SIZE, type SelectionSession } from '../entities/selectionSession'
import type { Stick } from '../entities/stick'

function shuffle<T>(items: T[]): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/** Uniform, without replacement, capped at 5 or fewer if the pool has fewer sticks (§6.1). */
export function randomDraw(poolSticks: Stick[], max: number = MAX_DRAW_SIZE): Stick[] {
  return shuffle(poolSticks).slice(0, max)
}

/**
 * Discarding a drawn stick permanently excludes it from the rest of the session and
 * immediately draws one replacement from whatever's left, if anything remains (§6.2).
 */
export function discardAndRedraw(
  session: SelectionSession,
  poolSticks: Stick[],
  discardStickId: string,
): SelectionSession {
  const drawnStickIds = session.drawnStickIds.filter((id) => id !== discardStickId)
  const discardedStickIds = session.discardedStickIds.includes(discardStickId)
    ? session.discardedStickIds
    : [...session.discardedStickIds, discardStickId]

  const ineligible = new Set([...drawnStickIds, ...discardedStickIds])
  const eligible = poolSticks.filter((s) => !ineligible.has(s.id))

  if (eligible.length === 0) {
    return { ...session, drawnStickIds, discardedStickIds }
  }

  const [replacement] = shuffle(eligible)
  return {
    ...session,
    drawnStickIds: [...drawnStickIds, replacement.id],
    discardedStickIds,
  }
}
