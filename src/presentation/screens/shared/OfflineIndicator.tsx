import { useConnectivityStore } from '../../../state/useConnectivityStore'

/** §11: a subtle reassurance that the app is fully functional offline, since
 * users may otherwise be uncertain whether a local-storage-only web app works
 * without a connection (unlike native mobile, where that's assumed). */
export function OfflineIndicator() {
  const isOnline = useConnectivityStore((s) => s.isOnline)

  if (isOnline) return null

  return (
    <div role="status" className="offline-indicator">
      You're offline — everything here still works, since all your data is stored on this device.
    </div>
  )
}
