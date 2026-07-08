import { useNoticeStore } from '../../../state/useNoticeStore'

export function NoticeBanner() {
  const message = useNoticeStore((s) => s.message)
  const clear = useNoticeStore((s) => s.clear)

  if (!message) return null

  return (
    <div role="status" className="notice-banner">
      <span>{message}</span>
      <button type="button" onClick={clear} aria-label="Dismiss notice">
        ×
      </button>
    </div>
  )
}
