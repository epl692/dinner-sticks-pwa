import { useState } from 'react'
import type { Stick } from '../../../domain/entities/stick'
import { ConfirmDialog } from '../shared/ConfirmDialog'

interface StickListItemProps {
  stick: Stick
  onEdit: () => void
  onDelete: () => void
}

export function StickListItem({ stick, onEdit, onDelete }: StickListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <li>
      <span aria-label={`${stick.name}, meal idea`}>{stick.name}</span>
      <button type="button" onClick={onEdit}>
        Edit
      </button>
      <button type="button" onClick={() => setConfirmOpen(true)}>
        Delete
      </button>

      <ConfirmDialog
        open={confirmOpen}
        title={`Delete ${stick.name}?`}
        description={`${stick.name} will be permanently deleted and will never appear again, including in future draws.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          onDelete()
          setConfirmOpen(false)
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  )
}
