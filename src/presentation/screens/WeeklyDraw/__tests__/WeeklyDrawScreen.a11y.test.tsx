import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { createPool } from '../../../../domain/entities/pool'
import { createStick } from '../../../../domain/entities/stick'
import { createWeeklyBin } from '../../../../domain/entities/weeklyBin'
import { useBinStore } from '../../../../state/useBinStore'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { useSticksStore } from '../../../../state/useSticksStore'
import { WeeklyDrawScreen } from '../WeeklyDrawScreen'

describe('WeeklyDrawScreen accessibility', () => {
  it('has no axe violations while reviewing a fresh draw', async () => {
    const pool = createPool('Dinner')
    const sticks = [
      createStick(pool.id, 'Tacos'),
      createStick(pool.id, 'Soup'),
      createStick(pool.id, 'Pizza'),
    ]

    usePoolsStore.setState({ pools: [pool], activePoolId: pool.id, loaded: true })
    useSticksStore.setState({ poolId: pool.id, sticks })
    useBinStore.setState({ poolId: pool.id, bin: null })
    // No prior bin, so the screen auto-starts a draw on mount instead of
    // showing the replace-confirmation dialog first.

    const { container } = render(<WeeklyDrawScreen />)
    expect((await axe(container)).violations).toEqual([])
  })

  it('has no axe violations on the replace-existing-bin confirmation', async () => {
    const pool = createPool('Dinner')
    const stick = createStick(pool.id, 'Tacos')

    // Seed an existing bin BEFORE mount — the screen reads it once, at mount,
    // to decide whether to show this confirmation dialog.
    usePoolsStore.setState({ pools: [pool], activePoolId: pool.id, loaded: true })
    useSticksStore.setState({ poolId: pool.id, sticks: [stick] })
    useBinStore.setState({ poolId: pool.id, bin: createWeeklyBin(pool.id, [stick.id]) })

    const { container, findByRole } = render(<WeeklyDrawScreen />)
    await findByRole('dialog')
    expect((await axe(container)).violations).toEqual([])
  })
})
