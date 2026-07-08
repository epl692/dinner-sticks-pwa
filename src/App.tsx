import { useEffect, useState } from 'react'
import { seedIfEmpty } from './data/seed'
import { NavigationStack } from './presentation/navigation/NavigationStack'
import { NoticeBanner } from './presentation/screens/shared/NoticeBanner'
import { usePoolsStore } from './state/usePoolsStore'

function App() {
  const loadPools = usePoolsStore((s) => s.loadPools)
  const loaded = usePoolsStore((s) => s.loaded)
  const [initError, setInitError] = useState<string | null>(null)

  useEffect(() => {
    seedIfEmpty()
      .then(() => loadPools())
      .catch((err: unknown) => setInitError(String(err)))
  }, [loadPools])

  if (initError) {
    return <p role="alert">Something went wrong loading your data: {initError}</p>
  }

  if (!loaded) {
    return <p>Loading…</p>
  }

  return (
    <>
      <NoticeBanner />
      <NavigationStack />
    </>
  )
}

export default App
