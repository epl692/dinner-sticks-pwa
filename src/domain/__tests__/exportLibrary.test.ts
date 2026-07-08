import { describe, expect, it } from 'vitest'
import { createPool } from '../entities/pool'
import { createStick } from '../entities/stick'
import { serializeLibrary } from '../io/exportLibrary'
import { LIBRARY_SCHEMA_VERSION } from '../io/librarySchema'

describe('serializeLibrary', () => {
  it('exports pools and sticks by name only, tagged with a schema version', () => {
    const dinner = createPool('Dinner')
    const lunch = createPool('Lunch')
    const tacos = createStick(dinner.id, 'Tacos')
    const soup = createStick(lunch.id, 'Soup')

    const file = serializeLibrary([dinner, lunch], [tacos, soup])

    expect(file).toEqual({
      schemaVersion: LIBRARY_SCHEMA_VERSION,
      pools: [{ name: 'Dinner' }, { name: 'Lunch' }],
      sticks: [
        { poolName: 'Dinner', name: 'Tacos' },
        { poolName: 'Lunch', name: 'Soup' },
      ],
    })
  })

  it('drops sticks referencing a pool not included in the export', () => {
    const dinner = createPool('Dinner')
    const orphanStick = createStick('some-other-pool-id', 'Ghost')

    const file = serializeLibrary([dinner], [orphanStick])

    expect(file.sticks).toEqual([])
  })

  it('never includes ids, timestamps, or bin state', () => {
    const dinner = createPool('Dinner')
    const file = serializeLibrary([dinner], [])
    expect(file.pools[0]).not.toHaveProperty('id')
    expect(file.pools[0]).not.toHaveProperty('createdAt')
  })
})
