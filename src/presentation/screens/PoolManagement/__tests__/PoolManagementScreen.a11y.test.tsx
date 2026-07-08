import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { createPool } from '../../../../domain/entities/pool'
import { createStick } from '../../../../domain/entities/stick'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { useSticksStore } from '../../../../state/useSticksStore'
import { PoolManagementScreen } from '../PoolManagementScreen'

describe('PoolManagementScreen accessibility', () => {
  it('has no axe violations with a populated list, including the import/export panel', async () => {
    const pool = createPool('Dinner')
    const sticks = [createStick(pool.id, 'Tacos'), createStick(pool.id, 'Soup')]

    usePoolsStore.setState({ pools: [pool], activePoolId: pool.id, loaded: true })
    useSticksStore.setState({ poolId: pool.id, sticks })

    const { container } = render(<PoolManagementScreen />)
    expect((await axe(container)).violations).toEqual([])
  })

  it('has no axe violations in the empty-list state', async () => {
    const pool = createPool('Dinner')
    usePoolsStore.setState({ pools: [pool], activePoolId: pool.id, loaded: true })
    useSticksStore.setState({ poolId: pool.id, sticks: [] })

    const { container } = render(<PoolManagementScreen />)
    expect((await axe(container)).violations).toEqual([])
  })
})
