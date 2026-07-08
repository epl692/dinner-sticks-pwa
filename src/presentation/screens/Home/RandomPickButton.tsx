interface RandomPickButtonProps {
  disabled: boolean
  onPick: () => void
}

export function RandomPickButton({ disabled, onPick }: RandomPickButtonProps) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-label="Pick a random meal from this week's plan"
    >
      Pick for me
    </button>
  )
}
