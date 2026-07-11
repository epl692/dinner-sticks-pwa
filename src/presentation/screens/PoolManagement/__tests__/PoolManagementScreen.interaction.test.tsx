import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../../../data/db'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { useSticksStore } from '../../../../state/useSticksStore'
import { PoolManagementScreen } from '../PoolManagementScreen'

const initialPoolsState = usePoolsStore.getState()
const initialSticksState = useSticksStore.getState()

beforeEach(async () => {
  usePoolsStore.setState(initialPoolsState, true)
  useSticksStore.setState(initialSticksState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
  await usePoolsStore.getState().addPool('Dinner')
})

describe('PoolManagementScreen interaction', () => {
  it('adds a meal idea and persists it', async () => {
    const user = userEvent.setup()
    render(<PoolManagementScreen />)

    await user.click(screen.getByRole('button', { name: 'Add a meal idea' }))
    await user.type(screen.getByLabelText('Meal idea name'), 'Tacos')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByText('Tacos')).toBeInTheDocument()
    const persisted = await db.sticks.toArray()
    expect(persisted.map((s) => s.name)).toEqual(['Tacos'])
  })

  it('rejects a duplicate name inline without navigating away from the form', async () => {
    const user = userEvent.setup()
    await useSticksStore.getState().addStick('Tacos')
    render(<PoolManagementScreen />)

    await user.click(screen.getByRole('button', { name: 'Add a meal idea' }))
    await user.type(screen.getByLabelText('Meal idea name'), 'tacos')
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That name is already used in this pool.',
    )
    // Still on the form — Add button target didn't get submitted successfully.
    expect(screen.getByLabelText('Meal idea name')).toBeInTheDocument()
  })

  it('deletes a meal idea after confirmation', async () => {
    const user = userEvent.setup()
    await useSticksStore.getState().addStick('Tacos')
    render(<PoolManagementScreen />)

    await user.click(screen.getByRole('button', { name: 'Tacos actions' }))
    const menu = await screen.findByRole('dialog')
    await user.click(within(menu).getByRole('button', { name: 'Delete' }))
    const confirmDialog = await screen.findByRole('dialog')
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    await waitFor(async () => {
      expect(await db.sticks.count()).toBe(0)
    })
  })
})
