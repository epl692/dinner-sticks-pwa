import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { createPool } from '../../../../domain/entities/pool'
import { usePoolsStore } from '../../../../state/usePoolsStore'
import { PoolSwitcherScreen } from '../PoolSwitcherScreen'

describe('PoolSwitcherScreen accessibility', () => {
  it('has no axe violations with multiple pools listed', async () => {
    const dinner = createPool('Dinner')
    const lunch = createPool('Lunch')

    usePoolsStore.setState({ pools: [dinner, lunch], activePoolId: dinner.id, loaded: true })

    const { container } = render(<PoolSwitcherScreen />)
    expect((await axe(container)).violations).toEqual([])
  })
})
