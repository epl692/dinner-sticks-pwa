import { create } from 'zustand'

export type ScreenName = 'home' | 'weeklyDraw' | 'poolManagement' | 'poolSwitcher'

interface NavigationState {
  stack: ScreenName[]
  push: (screen: ScreenName) => void
  pop: () => void
  /** Replaces the whole stack — used for redirects that shouldn't leave a "back" trail. */
  reset: (screen: ScreenName) => void
}

export const useNavigationStack = create<NavigationState>((set) => ({
  stack: ['home'],
  push: (screen) => set((state) => ({ stack: [...state.stack, screen] })),
  pop: () => set((state) => (state.stack.length > 1 ? { stack: state.stack.slice(0, -1) } : state)),
  reset: (screen) => set({ stack: [screen] }),
}))
