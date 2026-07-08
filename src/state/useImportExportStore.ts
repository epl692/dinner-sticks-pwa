import { create } from 'zustand'
import { serializeLibrary } from '../domain/io/exportLibrary'
import {
  buildReplacePlan,
  validateLibraryFile,
  type LibraryValidationError,
} from '../domain/io/importLibrary'
import type { LibraryFile } from '../domain/io/librarySchema'
import { replaceLibrary } from '../data/repositories/libraryRepository'
import * as stickRepository from '../data/repositories/stickRepository'
import { usePoolsStore } from './usePoolsStore'

function triggerJsonDownload(file: LibraryFile, filename: string): void {
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

interface ImportExportState {
  pendingFile: LibraryFile | null
  validationErrors: LibraryValidationError[]
  exportLibrary: () => Promise<void>
  /** Reads and validates a file; stages it for confirmation, or sets validationErrors (§4.6). */
  stageImport: (file: File) => Promise<void>
  /** Applies the staged import — full destructive replace, no partial apply. */
  confirmImport: () => Promise<void>
  cancelImport: () => void
}

export const useImportExportStore = create<ImportExportState>((set, get) => ({
  pendingFile: null,
  validationErrors: [],

  exportLibrary: async () => {
    const { pools } = usePoolsStore.getState()
    const allSticks = await stickRepository.getAllSticks()
    const file = serializeLibrary(pools, allSticks)
    triggerJsonDownload(file, 'dinner-sticks-meals.json')
  },

  stageImport: async (file) => {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      set({ pendingFile: null, validationErrors: ['invalid_shape'] })
      return
    }

    const result = validateLibraryFile(parsed)
    if (!result.valid) {
      set({ pendingFile: null, validationErrors: result.errors })
      return
    }
    set({ pendingFile: parsed as LibraryFile, validationErrors: [] })
  },

  confirmImport: async () => {
    const { pendingFile } = get()
    if (!pendingFile) return

    const plan = buildReplacePlan(pendingFile)
    await replaceLibrary(plan.pools, plan.sticks)
    set({ pendingFile: null, validationErrors: [] })

    // The first pool in the file becomes active, per §4.6 — set it explicitly
    // rather than relying on repository read order, which isn't file order.
    await usePoolsStore.getState().loadPools()
    const firstPoolId = plan.pools[0]?.id
    if (firstPoolId) {
      await usePoolsStore.getState().setActivePool(firstPoolId)
    }
  },

  cancelImport: () => set({ pendingFile: null, validationErrors: [] }),
}))
