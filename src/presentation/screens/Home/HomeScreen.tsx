import { useState } from 'react'
import { filterActiveDisplayable } from '../../../domain/rules/staleReferences'
import { useBinStore } from '../../../state/useBinStore'
import { usePoolsStore } from '../../../state/usePoolsStore'
import { useSticksStore } from '../../../state/useSticksStore'
import { useNavigationStack } from '../../navigation/useNavigationStack'
import { AddStickToBinDialog } from '../shared/AddStickToBinDialog'
import { EmptyState } from '../shared/EmptyState'
import { BinList } from './BinList'
import { RandomPickButton } from './RandomPickButton'

export function HomeScreen() {
  const pools = usePoolsStore((s) => s.pools)
  const activePoolId = usePoolsStore((s) => s.activePoolId)
  const sticks = useSticksStore((s) => s.sticks)
  const bin = useBinStore((s) => s.bin)
  const markDone = useBinStore((s) => s.markDone)
  const push = useNavigationStack((s) => s.push)

  const [selectedStickId, setSelectedStickId] = useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const activePool = pools.find((p) => p.id === activePoolId)
  const activeSticks = bin ? filterActiveDisplayable(bin, sticks) : []

  function handleRandomPick() {
    if (activeSticks.length === 0) return
    const pick = activeSticks[Math.floor(Math.random() * activeSticks.length)]
    setSelectedStickId(pick.id)
  }

  async function handleMarkDone(stickId: string) {
    await markDone(stickId)
    setSelectedStickId(null)
  }

  return (
    <main>
      <button
        type="button"
        onClick={() => push('poolSwitcher')}
        aria-label={`Active pool: ${activePool?.name ?? ''}. Tap to switch.`}
      >
        {activePool?.name}
      </button>

      {activeSticks.length === 0 ? (
        <EmptyState
          message="No meals planned this week"
          actionLabel="Start a weekly draw"
          onAction={() => push('weeklyDraw')}
        />
      ) : (
        <>
          <RandomPickButton disabled={activeSticks.length === 0} onPick={handleRandomPick} />
          <BinList
            activeSticks={activeSticks}
            selectedStickId={selectedStickId}
            onSelect={setSelectedStickId}
            onMarkDone={handleMarkDone}
          />
        </>
      )}

      {bin && (
        <button type="button" onClick={() => setAddDialogOpen(true)}>
          Add a meal to this week's plan
        </button>
      )}

      {activeSticks.length > 0 && (
        <button type="button" onClick={() => push('weeklyDraw')}>
          Start a new weekly draw
        </button>
      )}

      <button type="button" onClick={() => push('poolManagement')}>
        Manage meal ideas
      </button>

      <AddStickToBinDialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} />
    </main>
  )
}
