import type { Stick } from '../../../domain/entities/stick'

interface ReplaceCandidateListProps {
  candidates: Stick[]
  onChoose: (stickId: string) => void
  emptyMessage: string
}

/** Pool sticks not currently in the bin — shared between Replace's Pick-one mode
 * and the Add action (§4.4, §4.4a), since both draw from the same candidate set. */
export function ReplaceCandidateList({ candidates, onChoose, emptyMessage }: ReplaceCandidateListProps) {
  if (candidates.length === 0) {
    return <p>{emptyMessage}</p>
  }

  return (
    <ul>
      {candidates.map((stick) => (
        <li key={stick.id}>
          <button type="button" onClick={() => onChoose(stick.id)}>
            {stick.name}
          </button>
        </li>
      ))}
    </ul>
  )
}
