import { useEffect, useRef } from 'react'
import { getReplaceCandidates } from '../../../domain/rules/replace'
import { useBinStore } from '../../../state/useBinStore'
import { useSticksStore } from '../../../state/useSticksStore'
import { ReplaceCandidateList } from './ReplaceCandidateList'

interface ReplacePickOneDialogProps {
  open: boolean
  stickId: string | null
  onClose: () => void
}

/** "Pick one" mode of Replace (§4.4) — shares ReplaceCandidateList with Add. */
export function ReplacePickOneDialog({ open, stickId, onClose }: ReplacePickOneDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const bin = useBinStore((s) => s.bin)
  const sticks = useSticksStore((s) => s.sticks)
  const replaceWithChoice = useBinStore((s) => s.replaceWithChoice)
  const candidates = bin ? getReplaceCandidates(sticks, bin) : []

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  async function handleChoose(chosenId: string) {
    if (!stickId) return
    await replaceWithChoice(stickId, chosenId)
    onClose()
  }

  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="replace-pick-one-title">
      <h2 id="replace-pick-one-title">Choose a replacement</h2>
      <ReplaceCandidateList
        candidates={candidates}
        onChoose={handleChoose}
        emptyMessage="No replacement is available — every meal idea in this pool is already in this week's plan."
      />
      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}
