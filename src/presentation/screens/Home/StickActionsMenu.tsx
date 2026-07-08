import { useState } from 'react'
import { useBinStore } from '../../../state/useBinStore'
import { useNoticeStore } from '../../../state/useNoticeStore'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { ReplacePickOneDialog } from '../shared/ReplacePickOneDialog'

interface StickActionsMenuProps {
  stickId: string
  stickName: string
}

/** Per-stick secondary actions (§5 Home): Replace (Random or Pick-one) and Remove. */
export function StickActionsMenu({ stickId, stickName }: StickActionsMenuProps) {
  const replaceRandom = useBinStore((s) => s.replaceRandom)
  const removeStick = useBinStore((s) => s.removeStick)
  const showNotice = useNoticeStore((s) => s.show)
  const [pickOneOpen, setPickOneOpen] = useState(false)
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false)

  async function handleReplaceRandom() {
    const ok = await replaceRandom(stickId)
    if (!ok) {
      showNotice(
        "No replacement is available — every meal idea in this pool is already in this week's plan.",
      )
    }
  }

  return (
    <div className="stick-actions">
      <button
        type="button"
        onClick={handleReplaceRandom}
        aria-label={`Replace ${stickName} with a random meal`}
      >
        Replace (random)
      </button>
      <button
        type="button"
        onClick={() => setPickOneOpen(true)}
        aria-label={`Replace ${stickName}, choosing which meal`}
      >
        Replace (pick one)
      </button>
      <button
        type="button"
        onClick={() => setConfirmRemoveOpen(true)}
        aria-label={`Remove ${stickName} from this week's plan`}
      >
        Remove
      </button>

      <ReplacePickOneDialog
        open={pickOneOpen}
        stickId={stickId}
        onClose={() => setPickOneOpen(false)}
      />

      <ConfirmDialog
        open={confirmRemoveOpen}
        title={`Remove ${stickName}?`}
        description={`${stickName} will be removed from this week's plan. It stays available in the pool for future weeks.`}
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          await removeStick(stickId)
          setConfirmRemoveOpen(false)
        }}
        onCancel={() => setConfirmRemoveOpen(false)}
      />
    </div>
  )
}
