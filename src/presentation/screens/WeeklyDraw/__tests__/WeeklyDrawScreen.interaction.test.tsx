import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../../data/db'
import { createPool } from '../../../../domain/entities/pool'
import { useBinStore } from '../../../../state/useBinStore'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { useSelectionSessionStore } from '../../../../state/useSelectionSessionStore'
import { useSticksStore } from '../../../../state/useSticksStore'
import { useNavigationStack } from '../../../navigation/useNavigationStack'
import { WeeklyDrawScreen } from '../WeeklyDrawScreen'

const initialPoolsState = usePoolsStore.getState()
const initialSticksState = useSticksStore.getState()
const initialBinState = useBinStore.getState()
const initialSessionState = useSelectionSessionStore.getState()
const initialNavState = useNavigationStack.getState()

beforeEach(async () => {
  usePoolsStore.setState(initialPoolsState, true)
  useSticksStore.setState(initialSticksState, true)
  useBinStore.setState(initialBinState, true)
  useSelectionSessionStore.setState(initialSessionState, true)
  useNavigationStack.setState(initialNavState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

describe('WeeklyDrawScreen interaction', () => {
  it('auto-draws on mount, discarding one draws a replacement, and confirm persists the bin and returns home', async () => {
    const user = userEvent.setup()
    const pool = createPool('Dinner')
    await usePoolsStore.getState().addPool(pool.name)
    const activePoolId = usePoolsStore.getState().activePoolId!
    for (const name of ['A', 'B', 'C', 'D', 'E', 'F']) {
      await useSticksStore.getState().addStick(name)
    }
    useNavigationStack.setState({ stack: ['weeklyDraw'] })

    render(<WeeklyDrawScreen />)

    expect(await screen.findByRole('heading', { name: "This week's draw" })).toBeInTheDocument()
    const discardButtons = screen.getAllByText('Discard')
    expect(discardButtons).toHaveLength(5)

    // Discard one — a replacement should be drawn, keeping the count at 5
    // (pool has 6 sticks, so a 6th one is available to redraw).
    await user.click(discardButtons[0])
    await waitFor(() => {
      expect(screen.getAllByText('Discard')).toHaveLength(5)
    })

    await user.click(screen.getByRole('button', { name: 'Confirm' }))

    await waitFor(() => {
      expect(useNavigationStack.getState().stack).toEqual(['home'])
    })
    expect(useBinStore.getState().bin?.activeStickIds).toHaveLength(5)

    const persisted = await db.weeklyBins.where('poolId').equals(activePoolId).first()
    expect(persisted?.activeStickIds).toHaveLength(5)
  })

  it('redirects to Pool Management and shows a notice when the pool has no sticks', async () => {
    const pool = createPool('Dinner')
    await usePoolsStore.getState().addPool(pool.name)
    useNavigationStack.setState({ stack: ['weeklyDraw'] })

    render(<WeeklyDrawScreen />)

    await waitFor(() => {
      expect(useNavigationStack.getState().stack).toEqual(['poolManagement'])
    })
  })
})
