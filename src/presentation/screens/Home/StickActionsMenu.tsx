import { useState } from 'react'
import { useBinStore } from '../../../state/useBinStore'
import { useNoticeStore } from '../../../state/useNoticeStore'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { OverflowMenu } from '../shared/OverflowMenu'
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
    <>
      <OverflowMenu
        triggerAriaLabel={`${stickName} actions`}
        title={`${stickName} actions`}
        items={[
          {
            key: 'replace-random',
            label: 'Replace (random)',
            ariaLabel: `Replace ${stickName} with a random meal`,
            onSelect: handleReplaceRandom,
          },
          {
            key: 'replace-pick-one',
            label: 'Replace (pick one)',
            ariaLabel: `Replace ${stickName}, choosing which meal`,
            onSelect: () => setPickOneOpen(true),
          },
          {
            key: 'remove',
            label: 'Remove',
            ariaLabel: `Remove ${stickName} from this week's plan`,
            destructive: true,
            onSelect: () => setConfirmRemoveOpen(true),
          },
        ]}
      />

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
    </>
  )
}
