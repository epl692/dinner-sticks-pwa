import { useEffect, useState } from 'react'
import { useBinStore } from '../../../state/useBinStore'
import { useNoticeStore } from '../../../state/useNoticeStore'
import { usePoolsStore } from '../../../state/usePoolsStore'
import { useSelectionSessionStore } from '../../../state/useSelectionSessionStore'
import { useSticksStore } from '../../../state/useSticksStore'
import { useNavigationStack } from '../../navigation/useNavigationStack'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { DrawnStickCard } from './DrawnStickCard'

export function WeeklyDrawScreen() {
  const sticks = useSticksStore((s) => s.sticks)
  const activePoolId = usePoolsStore((s) => s.activePoolId)
  const existingBin = useBinStore((s) => s.bin)
  const confirmDraw = useBinStore((s) => s.confirmDraw)
  const session = useSelectionSessionStore((s) => s.session)
  const reducedCount = useSelectionSessionStore((s) => s.reducedCount)
  const start = useSelectionSessionStore((s) => s.start)
  const discard = useSelectionSessionStore((s) => s.discard)
  const end = useSelectionSessionStore((s) => s.end)
  const reset = useNavigationStack((s) => s.reset)
  const showNotice = useNoticeStore((s) => s.show)

  // Computed in the render body, not inside a store selector — these would
  // otherwise return a fresh array/value each call and break React's
  // useSyncExternalStore snapshot-caching contract.
  const stickById = new Map(sticks.map((s) => [s.id, s]))
  const drawnSticks = session
    ? session.drawnStickIds.map((id) => stickById.get(id)).filter((s) => s !== undefined)
    : []
  const hasEligibleRemaining = session
    ? sticks.some(
        (s) => !session.drawnStickIds.includes(s.id) && !session.discardedStickIds.includes(s.id),
      )
    : false

  const [awaitingReplaceConfirm, setAwaitingReplaceConfirm] = useState(existingBin !== null)

  useEffect(() => {
    if (!activePoolId) return
    if (sticks.length === 0) {
      showNotice('Add some meal ideas first, then start a weekly draw.')
      reset('poolManagement')
      return
    }
    if (existingBin === null) {
      start(activePoolId)
    }
    // Intentionally mount-only: this screen fully remounts on every navigation in,
    // so re-running per render (e.g. on bin/sticks changes from our own actions
    // below) would restart the draw.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!activePoolId || sticks.length === 0) {
    return null
  }

  function handleConfirmReplace() {
    setAwaitingReplaceConfirm(false)
    if (activePoolId) start(activePoolId)
  }

  function handleCancelReplace() {
    reset('home')
  }

  if (awaitingReplaceConfirm) {
    return (
      <ConfirmDialog
        open
        title="Start a new weekly draw?"
        description="This replaces your current weekly plan with a new random draw. It won't undo anything already marked done."
        confirmLabel="Start new draw"
        onConfirm={handleConfirmReplace}
        onCancel={handleCancelReplace}
      />
    )
  }

  async function handleConfirm() {
    if (!session) return
    await confirmDraw(session.drawnStickIds)
    end()
    reset('home')
  }

  function handleCancel() {
    end()
    reset('home')
  }

  return (
    <main>
      <h1>This week's draw</h1>
      {reducedCount !== null && (
        <p>
          Your pool only has {reducedCount} meal idea{reducedCount === 1 ? '' : 's'}, so that's
          what got drawn.
        </p>
      )}
      <ul>
        {drawnSticks.map((stick) => (
          <DrawnStickCard key={stick.id} stick={stick} onDiscard={() => discard(stick.id)} />
        ))}
      </ul>
      {session && session.discardedStickIds.length > 0 && !hasEligibleRemaining && (
        <p role="status">
          Every remaining meal idea has been discarded — confirm this smaller set or cancel.
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" onClick={handleCancel}>
          Cancel
        </button>
        <button type="button" onClick={handleConfirm} disabled={drawnSticks.length === 0}>
          Confirm
        </button>
      </div>
    </main>
  )
}
