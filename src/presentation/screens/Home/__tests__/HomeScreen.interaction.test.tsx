import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../../data/db'
import { useBinStore } from '../../../../state/useBinStore'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { useSticksStore } from '../../../../state/useSticksStore'
import { HomeScreen } from '../HomeScreen'

const initialPoolsState = usePoolsStore.getState()
const initialSticksState = useSticksStore.getState()
const initialBinState = useBinStore.getState()

beforeEach(async () => {
  usePoolsStore.setState(initialPoolsState, true)
  useSticksStore.setState(initialSticksState, true)
  useBinStore.setState(initialBinState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
})

async function seedPoolWithBin(stickNames: string[]) {
  await usePoolsStore.getState().addPool('Dinner')
  const poolId = usePoolsStore.getState().activePoolId!
  for (const name of stickNames) {
    await useSticksStore.getState().addStick(name)
  }
  const stickIds = useSticksStore.getState().sticks.map((s) => s.id)
  await useBinStore.getState().confirmDraw(stickIds)
  return { poolId, stickIds }
}

describe('HomeScreen interaction', () => {
  it('random pick selects a stick and surfaces its Done action, which marks it done and persists', async () => {
    const user = userEvent.setup()
    await seedPoolWithBin(['Tacos'])

    render(<HomeScreen />)

    await user.click(
      screen.getByRole('button', { name: "Pick a random meal from this week's plan" }),
    )
    const doneButton = await screen.findByRole('button', {
      name: "Mark Tacos as done and remove from this week's plan",
    })

    await user.click(doneButton)

    await waitFor(() => {
      expect(screen.queryByText('Tacos')).not.toBeInTheDocument()
    })
    expect(useBinStore.getState().bin?.doneStickIds).toEqual(
      expect.arrayContaining([useSticksStore.getState().sticks[0].id]),
    )
    const persisted = await db.weeklyBins.toArray()
    expect(persisted[0].doneStickIds).toHaveLength(1)
  })

  it('Remove drops a stick from the bin after confirmation, without deleting it from the pool', async () => {
    const user = userEvent.setup()
    await seedPoolWithBin(['Tacos'])

    render(<HomeScreen />)

    await user.click(screen.getByRole('button', { name: "Remove Tacos from this week's plan" }))
    await user.click(await screen.findByRole('button', { name: 'Remove' }))

    await waitFor(() => {
      expect(useBinStore.getState().bin?.activeStickIds).toEqual([])
    })
    // Still in the pool, just not in the bin.
    expect(useSticksStore.getState().sticks.map((s) => s.name)).toEqual(['Tacos'])
  })

  it('shows the empty-state prompt when the bin has no active sticks', async () => {
    await usePoolsStore.getState().addPool('Dinner')

    render(<HomeScreen />)

    expect(await screen.findByText('No meals planned this week')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start a weekly draw' })).toBeInTheDocument()
  })
})
