import type { Stick } from '../../../domain/entities/stick'

interface DrawnStickCardProps {
  stick: Stick
  onDiscard: () => void
}

export function DrawnStickCard({ stick, onDiscard }: DrawnStickCardProps) {
  return (
    <li>
      <span>{stick.name}</span>
      <button
        type="button"
        onClick={onDiscard}
        aria-label={`Discard ${stick.name} and draw a replacement`}
      >
        Discard
      </button>
    </li>
  )
}
