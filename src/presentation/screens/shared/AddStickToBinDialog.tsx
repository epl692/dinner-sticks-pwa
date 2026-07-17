import { Shuffle } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { getAddCandidates } from '../../../domain/rules/addToBin'
import { useBinStore } from '../../../state/useBinStore'
import { useNoticeStore } from '../../../state/useNoticeStore'
import { useSticksStore } from '../../../state/useSticksStore'
import { ReplaceCandidateList } from './ReplaceCandidateList'

interface AddStickToBinDialogProps {
  open: boolean
  onClose: () => void
}

/** Bin-level action (§4.4a) — operates on the bin as a whole, not on one existing
 * bin entry, so it lives separately from the per-stick Replace/Remove actions. */
export function AddStickToBinDialog({ open, onClose }: AddStickToBinDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const bin = useBinStore((s) => s.bin)
  const sticks = useSticksStore((s) => s.sticks)
  const addStick = useBinStore((s) => s.addStick)
  const addRandom = useBinStore((s) => s.addRandom)
  const showNotice = useNoticeStore((s) => s.show)
  // Computed in the render body, not inside a store selector — getAddCandidates
  // returns a fresh array each call, which would otherwise break React's
  // useSyncExternalStore snapshot-caching contract and loop forever.
  const addCandidates = bin ? getAddCandidates(sticks, bin) : []

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  async function handleChoose(stickId: string) {
    await addStick(stickId)
    onClose()
  }

  async function handleShuffle() {
    const ok = await addRandom()
    if (!ok) {
      showNotice("Every meal idea in this pool is already in this week's plan.")
      return
    }
    onClose()
  }

  return (
    <dialog ref={ref} onCancel={onClose} onClose={onClose} aria-labelledby="add-to-bin-title">
      <h2 id="add-to-bin-title">Add a meal to this week's plan</h2>
      <button
        type="button"
        className="icon-button"
        onClick={handleShuffle}
        disabled={addCandidates.length === 0}
        aria-label="Add a random meal to this week's plan"
      >
        <Shuffle aria-hidden="true" size="1.1em" />
        Shuffle
      </button>
      <ReplaceCandidateList
        candidates={addCandidates}
        onChoose={handleChoose}
        emptyMessage="Every meal idea in this pool is already in this week's plan."
      />
      <div className="dialog-actions">
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </dialog>
  )
}
