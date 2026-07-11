import { useState } from 'react'
import type { Stick } from '../../../domain/entities/stick'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { OverflowMenu } from '../shared/OverflowMenu'

interface StickListItemProps {
  stick: Stick
  onEdit: () => void
  onDelete: () => void
}

export function StickListItem({ stick, onEdit, onDelete }: StickListItemProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <li className="single-line">
      <span className="row-primary row-primary-name" aria-label={`${stick.name}, meal idea`}>
        {stick.name}
      </span>
      <OverflowMenu
        triggerAriaLabel={`${stick.name} actions`}
        title={`${stick.name} actions`}
        items={[
          { key: 'edit', label: 'Edit', onSelect: onEdit },
          {
            key: 'delete',
            label: 'Delete',
            destructive: true,
            onSelect: () => setConfirmOpen(true),
          },
        ]}
      />

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
