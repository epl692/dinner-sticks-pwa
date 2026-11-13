import { useEffect } from 'react'
import { NavigationStack } from './presentation/navigation/NavigationStack'
import { SetupScreen } from './presentation/screens/Setup/SetupScreen'
import { JoinApprovalDialog } from './presentation/screens/shared/JoinApprovalDialog'
import { LegacyUploadPrompt } from './presentation/screens/shared/LegacyUploadPrompt'
import { NoticeBanner } from './presentation/screens/shared/NoticeBanner'
import { OfflineIndicator } from './presentation/screens/shared/OfflineIndicator'
import { watchLibrary } from './sync/dataContext'
import { useConnectivityStore } from './state/useConnectivityStore'
import { useFamilyStore } from './state/useFamilyStore'
import { usePoolsStore } from './state/usePoolsStore'

function App() {
  const phase = useFamilyStore((s) => s.phase)
  const error = useFamilyStore((s) => s.error)
  const start = useFamilyStore((s) => s.start)
  const loadPools = usePoolsStore((s) => s.loadPools)
  const loaded = usePoolsStore((s) => s.loaded)
  const initConnectivity = useConnectivityStore((s) => s.init)

  useEffect(() => {
    void start()
  }, [start])

  useEffect(() => initConnectivity(), [initConnectivity])

  // Once a family is open: load it, then reload whenever anything in it changes, here or on another device.
  useEffect(() => {
    if (phase !== 'ready') return
    let stop: (() => void) | undefined
    let cancelled = false
    loadPools()
      .then(() => {
        if (cancelled) return
        stop = watchLibrary(() => void usePoolsStore.getState().loadPools())
      })
      .catch((err: unknown) => useFamilyStore.setState({ phase: 'error', error: String(err) }))
    return () => {
      cancelled = true
      stop?.()
    }
  }, [phase, loadPools])

  if (phase === 'error') {
    return <p role="alert">Something went wrong loading your data: {error}</p>
  }

  if (phase === 'unsupported') {
    return (
      <main>
        <h1>Dinner Sticks</h1>
        <p role="alert">
          This browser can't do the secure encryption that sharing needs (it requires Ed25519 and
          X25519 in Web Crypto). Please update your browser, or try a current Chrome, Edge, Safari
          or Firefox.
        </p>
      </main>
    )
  }

  if (phase === 'starting' || (phase === 'ready' && !loaded)) {
    return <p>Loading…</p>
  }

  return (
    <>
      <OfflineIndicator />
      <NoticeBanner />
      {phase === 'setup' ? (
        <SetupScreen />
      ) : (
        <>
          <NavigationStack />
          <LegacyUploadPrompt />
        </>
      )}
      <JoinApprovalDialog />
    </>
  )
}

export default App
