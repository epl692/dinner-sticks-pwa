import { create } from 'zustand'

interface ConnectivityState {
  isOnline: boolean
  /** Wires up online/offline listeners; call once from a root component's effect. Returns cleanup. */
  init: () => () => void
}

export const useConnectivityStore = create<ConnectivityState>((set) => ({
  isOnline: typeof navigator === 'undefined' ? true : navigator.onLine,

  init: () => {
    const setOnline = () => set({ isOnline: true })
    const setOffline = () => set({ isOnline: false })
    window.addEventListener('online', setOnline)
    window.addEventListener('offline', setOffline)
    return () => {
      window.removeEventListener('online', setOnline)
      window.removeEventListener('offline', setOffline)
    }
  },
}))
