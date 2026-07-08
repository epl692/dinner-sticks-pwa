import { useState } from 'react'
import { useSticksStore } from '../../../state/useSticksStore'
import { useNavigationStack } from '../../navigation/useNavigationStack'
import { EmptyState } from '../shared/EmptyState'
import { StickEditorForm } from '../shared/StickEditorForm'
import { StickListItem } from './StickListItem'

type Mode = { kind: 'list' } | { kind: 'add' } | { kind: 'edit'; stickId: string }

export function PoolManagementScreen() {
  const sticks = useSticksStore((s) => s.sticks)
  const addStick = useSticksStore((s) => s.addStick)
  const renameStick = useSticksStore((s) => s.renameStick)
  const deleteStick = useSticksStore((s) => s.deleteStick)
  const pop = useNavigationStack((s) => s.pop)

  const [mode, setMode] = useState<Mode>({ kind: 'list' })

  const sorted = [...sticks].sort((a, b) => a.name.localeCompare(b.name))

  if (mode.kind === 'add') {
    return (
      <main>
        <h1>Add a meal idea</h1>
        <StickEditorForm
          submitLabel="Add"
          onSubmit={addStick}
          onSuccess={() => setMode({ kind: 'list' })}
          onCancel={() => setMode({ kind: 'list' })}
        />
      </main>
    )
  }

  if (mode.kind === 'edit') {
    const stick = sticks.find((s) => s.id === mode.stickId)!
    return (
      <main>
        <h1>Edit meal idea</h1>
        <StickEditorForm
          initialName={stick.name}
          submitLabel="Save"
          onSubmit={(name) => renameStick(stick.id, name)}
          onSuccess={() => setMode({ kind: 'list' })}
          onCancel={() => setMode({ kind: 'list' })}
        />
      </main>
    )
  }

  return (
    <main>
      <button type="button" onClick={pop}>
        Back
      </button>
      <h1>Meal ideas</h1>
      {sorted.length === 0 ? (
        <EmptyState
          message="No meal ideas yet — add one"
          actionLabel="Add a meal idea"
          onAction={() => setMode({ kind: 'add' })}
        />
      ) : (
        <>
          <ul>
            {sorted.map((stick) => (
              <StickListItem
                key={stick.id}
                stick={stick}
                onEdit={() => setMode({ kind: 'edit', stickId: stick.id })}
                onDelete={() => deleteStick(stick.id)}
              />
            ))}
          </ul>
          <button type="button" onClick={() => setMode({ kind: 'add' })}>
            Add a meal idea
          </button>
        </>
      )}
    </main>
  )
}
