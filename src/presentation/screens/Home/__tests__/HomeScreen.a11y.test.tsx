import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { createPool } from '../../../../domain/entities/pool'
import { createStick } from '../../../../domain/entities/stick'
import { createWeeklyBin } from '../../../../domain/entities/weeklyBin'
import { useBinStore } from '../../../../state/useBinStore'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { useSticksStore } from '../../../../state/useSticksStore'
import { HomeScreen } from '../HomeScreen'

describe('HomeScreen accessibility', () => {
  it('has no axe violations with a populated bin', async () => {
    const pool = createPool('Dinner')
    const stickA = createStick(pool.id, 'Tacos')
    const stickB = createStick(pool.id, 'Soup')
    const bin = createWeeklyBin(pool.id, [stickA.id, stickB.id])

    usePoolsStore.setState({ pools: [pool], activePoolId: pool.id, loaded: true })
    useSticksStore.setState({ poolId: pool.id, sticks: [stickA, stickB] })
    useBinStore.setState({ poolId: pool.id, bin })

    const { container } = render(<HomeScreen />)
    expect((await axe(container)).violations).toEqual([])
  })

  it('has no axe violations in the empty-bin state', async () => {
    const pool = createPool('Dinner')
    usePoolsStore.setState({ pools: [pool], activePoolId: pool.id, loaded: true })
    useSticksStore.setState({ poolId: pool.id, sticks: [] })
    useBinStore.setState({ poolId: pool.id, bin: null })

    const { container } = render(<HomeScreen />)
    expect((await axe(container)).violations).toEqual([])
  })
})
