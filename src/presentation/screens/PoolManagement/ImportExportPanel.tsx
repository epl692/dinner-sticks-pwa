import { useRef, useState, type ChangeEvent } from 'react'
import { useImportExportStore } from '../../../state/useImportExportStore'
import { useNavigationStack } from '../../navigation/useNavigationStack'
import { ConfirmDialog } from '../shared/ConfirmDialog'

const ERROR_MESSAGES: Record<string, string> = {
  invalid_shape: "That file doesn't look like a Dinner Sticks meal library export.",
  no_pools: 'That file has no pools in it, so there is nothing to import.',
  duplicate_pool_name: 'That file has two pools with the same name.',
  duplicate_stick_name: 'That file has two meal ideas with the same name in the same pool.',
  unknown_pool_reference: 'That file references a pool that is not defined in it.',
}

/** §4.6: export is immediate/non-destructive; import is a full destructive
 * replace, gated behind validation and an explicit confirmation. */
export function ImportExportPanel() {
  const pendingFile = useImportExportStore((s) => s.pendingFile)
  const validationErrors = useImportExportStore((s) => s.validationErrors)
  const exportLibrary = useImportExportStore((s) => s.exportLibrary)
  const stageImport = useImportExportStore((s) => s.stageImport)
  const confirmImport = useImportExportStore((s) => s.confirmImport)
  const cancelImport = useImportExportStore((s) => s.cancelImport)
  const reset = useNavigationStack((s) => s.reset)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    await exportLibrary()
    setExporting(false)
  }

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await stageImport(file)
  }

  async function handleConfirmImport() {
    await confirmImport()
    reset('home')
  }

  return (
    <section>
      <h2>Meal library</h2>
      <button type="button" onClick={handleExport} disabled={exporting}>
        Export meal library as a file
      </button>
      <button type="button" onClick={() => fileInputRef.current?.click()}>
        Import meal library from a file — replaces all current pools and meal ideas
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleFileSelected}
        style={{ display: 'none' }}
      />

      {validationErrors.length > 0 && (
        <p role="alert">{validationErrors.map((err) => ERROR_MESSAGES[err] ?? err).join(' ')}</p>
      )}

      <ConfirmDialog
        open={pendingFile !== null}
        title="Replace your meal library?"
        description="This will replace all pools and meal ideas currently on this device with the contents of the imported file. This cannot be undone."
        confirmLabel="Replace"
        destructive
        onConfirm={handleConfirmImport}
        onCancel={cancelImport}
      />
    </section>
  )
}
