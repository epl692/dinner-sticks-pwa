import { useEffect, useState } from 'react'
import type { LegacyLibrary } from '../../../data/legacy/legacyDb'
import {
  declineLegacyUpload,
  findLegacyLibrary,
  uploadLegacyLibrary,
} from '../../../state/legacyMigration'
import { useFamilyStore } from '../../../state/useFamilyStore'
import { useNoticeStore } from '../../../state/useNoticeStore'
import { usePoolsStore } from '../../../state/usePoolsStore'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * One-time offer, on the first launch after sync was added, to copy the meals this device already
 * had into the family. Declining is remembered; the Family screen keeps the option open.
 */
export function LegacyUploadPrompt() {
  const familyName = useFamilyStore((s) => s.familyName)
  const showNotice = useNoticeStore((s) => s.show)
  const [library, setLibrary] = useState<LegacyLibrary | null>(null)

  useEffect(() => {
    let cancelled = false
    void findLegacyLibrary().then((found) => {
      if (!cancelled && found && found.decision === null) setLibrary(found.library)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <ConfirmDialog
      open={library !== null}
      title="Add the meals on this device to your family?"
      description={
        library
          ? `This device has ${library.sticks.length} meal ideas in ${library.pools.length} pool${library.pools.length === 1 ? '' : 's'} from before sharing was added. ` +
            `They can be added to ${familyName ?? 'your family'} so everyone sees them. Nothing already in the family is changed or removed, and the copy on this device is kept as a backup.`
          : ''
      }
      confirmLabel="Add them"
      cancelLabel="Not now"
      onConfirm={() => {
        const lib = library
        setLibrary(null)
        if (!lib) return
        void uploadLegacyLibrary(lib)
          .then(async (result) => {
            await usePoolsStore.getState().loadPools()
            showNotice(`Added ${result.sticks} meal ideas from this device.`)
          })
          .catch((err: unknown) =>
            showNotice(`Couldn't add them: ${err instanceof Error ? err.message : String(err)}`),
          )
      }}
      onCancel={() => {
        if (library) declineLegacyUpload()
        setLibrary(null)
      }}
    />
  )
}
