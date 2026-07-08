import type { Stick } from '../../../domain/entities/stick'
import { StickActionsMenu } from './StickActionsMenu'

interface BinListProps {
  activeSticks: Stick[]
  selectedStickId: string | null
  onSelect: (id: string) => void
  onMarkDone: (id: string) => void
}

export function BinList({ activeSticks, selectedStickId, onSelect, onMarkDone }: BinListProps) {
  return (
    <ul className="bin-list">
      {activeSticks.map((stick) => {
        const selected = stick.id === selectedStickId
        return (
          <li key={stick.id} className={selected ? 'selected' : undefined}>
            <button
              type="button"
              onClick={() => onSelect(stick.id)}
              aria-pressed={selected}
              aria-label={`${stick.name}, in this week's plan${selected ? ', selected' : ''}`}
            >
              {stick.name}
              {selected && <span className="state-hint"> — selected</span>}
            </button>
            {selected && (
              <button
                type="button"
                onClick={() => onMarkDone(stick.id)}
                aria-label={`Mark ${stick.name} as done and remove from this week's plan`}
              >
                Done
              </button>
            )}
            <StickActionsMenu stickId={stick.id} stickName={stick.name} />
          </li>
        )
      })}
    </ul>
  )
}
