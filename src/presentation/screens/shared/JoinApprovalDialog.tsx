import { useFamilyStore } from '../../../state/useFamilyStore'
import { ConfirmDialog } from './ConfirmDialog'

/** Shown to a family owner when someone presents an invite link they created. */
export function JoinApprovalDialog() {
  const pending = useFamilyStore((s) => s.pendingJoin)

  return (
    <ConfirmDialog
      open={pending !== null}
      title="Someone wants to join your family"
      description={
        pending
          ? `${pending.request.deviceName ? `${pending.request.deviceName} is` : 'A new device is'} using your invite link. ` +
            `Their screen should show these five words: ${pending.request.sas}. ` +
            `Only let them in if the words match and you sent the invite to them.`
          : ''
      }
      confirmLabel="Let them in"
      cancelLabel="Decline"
      onConfirm={() => pending?.decide(true)}
      onCancel={() => pending?.decide(false)}
    />
  )
}
