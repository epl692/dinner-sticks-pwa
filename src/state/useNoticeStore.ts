import { create } from 'zustand'

/** One-off user-facing notices (§4.2, §4.4: "the user is told so"). */
interface NoticeState {
  message: string | null
  show: (message: string) => void
  clear: () => void
}

export const useNoticeStore = create<NoticeState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}))
