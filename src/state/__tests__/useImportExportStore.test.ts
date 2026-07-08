import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/db'
import { useImportExportStore } from '../useImportExportStore'
import { usePoolsStore } from '../usePoolsStore'
import { useSticksStore } from '../useSticksStore'

const initialPoolsState = usePoolsStore.getState()
const initialSticksState = useSticksStore.getState()
const initialImportExportState = useImportExportStore.getState()

beforeEach(async () => {
  usePoolsStore.setState(initialPoolsState, true)
  useSticksStore.setState(initialSticksState, true)
  useImportExportStore.setState(initialImportExportState, true)
  await db.pools.clear()
  await db.sticks.clear()
  await db.weeklyBins.clear()
  vi.restoreAllMocks()
})

describe('exportLibrary', () => {
  it('serializes all pools/sticks across every pool and triggers a download', async () => {
    await usePoolsStore.getState().addPool('Dinner')
    await useSticksStore.getState().addStick('Tacos')
    await usePoolsStore.getState().addPool('Lunch')
    await useSticksStore.getState().addStick('Soup')

    let capturedBlob: Blob | null = null
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      capturedBlob = blob as Blob
      return 'blob:mock'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    await useImportExportStore.getState().exportLibrary()

    expect(capturedBlob).not.toBeNull()
    const parsed = JSON.parse(await capturedBlob!.text())
    expect(parsed.pools.map((p: { name: string }) => p.name).sort()).toEqual(['Dinner', 'Lunch'])
    expect(parsed.sticks).toEqual(
      expect.arrayContaining([
        { poolName: 'Dinner', name: 'Tacos' },
        { poolName: 'Lunch', name: 'Soup' },
      ]),
    )
  })
})

describe('import flow', () => {
  it('stages a valid file and confirms a full destructive replace', async () => {
    await usePoolsStore.getState().addPool('Old Pool')
    await useSticksStore.getState().addStick('Old Stick')

    const file = new File(
      [
        JSON.stringify({
          schemaVersion: 1,
          pools: [{ name: 'Breakfast' }],
          sticks: [{ poolName: 'Breakfast', name: 'Pancakes' }],
        }),
      ],
      'library.json',
      { type: 'application/json' },
    )

    await useImportExportStore.getState().stageImport(file)
    expect(useImportExportStore.getState().validationErrors).toEqual([])
    expect(useImportExportStore.getState().pendingFile).not.toBeNull()

    await useImportExportStore.getState().confirmImport()

    expect(useImportExportStore.getState().pendingFile).toBeNull()
    expect(usePoolsStore.getState().pools).toHaveLength(1)
    expect(usePoolsStore.getState().pools[0].name).toBe('Breakfast')
    // First (and only) pool in the file becomes active, per §4.6.
    expect(useSticksStore.getState().poolId).toBe(usePoolsStore.getState().pools[0].id)
    expect(useSticksStore.getState().sticks.map((s) => s.name)).toEqual(['Pancakes'])
  })

  it('does not stage on a malformed (non-JSON) file', async () => {
    const file = new File(['not json'], 'library.json', { type: 'application/json' })

    await useImportExportStore.getState().stageImport(file)

    expect(useImportExportStore.getState().pendingFile).toBeNull()
    expect(useImportExportStore.getState().validationErrors).toEqual(['invalid_shape'])
  })

  it('rejects a file with zero pools, leaving existing data untouched', async () => {
    await usePoolsStore.getState().addPool('Keep Me')
    const file = new File(
      [JSON.stringify({ schemaVersion: 1, pools: [], sticks: [] })],
      'library.json',
      { type: 'application/json' },
    )

    await useImportExportStore.getState().stageImport(file)

    expect(useImportExportStore.getState().validationErrors).toContain('no_pools')
    expect(usePoolsStore.getState().pools.map((p) => p.name)).toEqual(['Keep Me'])
  })

  it('cancelImport discards the staged file with zero side effects', async () => {
    const file = new File(
      [JSON.stringify({ schemaVersion: 1, pools: [{ name: 'Breakfast' }], sticks: [] })],
      'library.json',
      { type: 'application/json' },
    )
    await useImportExportStore.getState().stageImport(file)
    expect(useImportExportStore.getState().pendingFile).not.toBeNull()

    useImportExportStore.getState().cancelImport()

    expect(useImportExportStore.getState().pendingFile).toBeNull()
    expect(await db.pools.count()).toBe(0)
  })
})
