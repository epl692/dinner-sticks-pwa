import { useEffect, useState } from 'react'
import { seedIfEmpty } from './data/seed'
import { NavigationStack } from './presentation/navigation/NavigationStack'
import { NoticeBanner } from './presentation/screens/shared/NoticeBanner'
import { OfflineIndicator } from './presentation/screens/shared/OfflineIndicator'
import { useConnectivityStore } from './state/useConnectivityStore'
import { usePoolsStore } from './state/usePoolsStore'

function App() {
  const loadPools = usePoolsStore((s) => s.loadPools)
  const loaded = usePoolsStore((s) => s.loaded)
  const initConnectivity = useConnectivityStore((s) => s.init)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    seedIfEmpty()
      .then(() => loadPools())
      .catch((err: unknown) => setInitError(String(err)))
  }, [loadPools])

  useEffect(() => initConnectivity(), [initConnectivity])

  if (initError) {
    return <p role="alert">Something went wrong loading your data: {initError}</p>
  }

  if (!loaded) {
    return <p>Loading…</p>
  }

  return (
    <>
      <OfflineIndicator />
      <NoticeBanner />
      <NavigationStack />
    </>
  )
}

export default App
