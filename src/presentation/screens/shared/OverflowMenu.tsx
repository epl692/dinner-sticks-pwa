import { useEffect, useId, useRef, useState } from 'react'

export interface OverflowMenuItem {
  key: string
  label: string
  ariaLabel?: string
  onSelect: () => void
  destructive?: boolean
}

interface OverflowMenuProps {
  triggerAriaLabel: string
  title: string
  items: OverflowMenuItem[]
}

/**
 * Shared overflow ("hamburger") menu for per-row secondary actions, so rows can
 * stay on one line. Uses the native <dialog> element (like ConfirmDialog and the
 * other modals) for its built-in focus trap and focus-return behavior.
 */
export function OverflowMenu({ triggerAriaLabel, title, items }: OverflowMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        className="overflow-menu-trigger row-fixed"
        aria-label={triggerAriaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        ⋮
      </button>
      <dialog
        ref={ref}
        onCancel={() => setOpen(false)}
        onClose={() => setOpen(false)}
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>{title}</h2>
        <div className="overflow-menu-items">
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              className={item.destructive ? 'destructive' : undefined}
              aria-label={item.ariaLabel}
              onClick={() => {
                item.onSelect()
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
      </dialog>
    </>
  )
}
