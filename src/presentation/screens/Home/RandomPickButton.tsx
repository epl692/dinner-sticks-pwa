import { Shuffle } from 'lucide-react'

interface RandomPickButtonProps {
  disabled: boolean
  onPick: () => void
}

export function RandomPickButton({ disabled, onPick }: RandomPickButtonProps) {
  return (
    <button
      type="button"
      className="icon-button"
      onClick={onPick}
      disabled={disabled}
      aria-label="Pick a random meal from this week's plan"
    >
      <Shuffle aria-hidden="true" size="1.1em" />
      Shuffle
    </button>
  )
}
