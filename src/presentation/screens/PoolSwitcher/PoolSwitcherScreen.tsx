import { useState } from 'react'
import { usePoolsStore } from '../../../state/usePoolsStore'
import { useNavigationStack } from '../../navigation/useNavigationStack'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { AddPoolForm } from './AddPoolForm'

export function PoolSwitcherScreen() {
  const pools = usePoolsStore((s) => s.pools)
  const activePoolId = usePoolsStore((s) => s.activePoolId)
  const setActivePool = usePoolsStore((s) => s.setActivePool)
  const renamePool = usePoolsStore((s) => s.renamePool)
  const deletePool = usePoolsStore((s) => s.deletePool)
  const reset = useNavigationStack((s) => s.reset)
  const pop = useNavigationStack((s) => s.pop)

  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<'empty' | 'duplicate' | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  async function handleSelect(id: string) {
    await setActivePool(id)
    reset('home')
  }

  async function handleRenameSubmit(id: string) {
    const result = await renamePool(id, renameValue)
    if (result.ok) {
      setRenamingId(null)
    } else {
      setRenameError(result.error)
    }
  }

  const poolPendingDelete = pools.find((p) => p.id === confirmDeleteId)

  return (
    <main>
      <button type="button" onClick={pop}>
        Back
      </button>
      <h1>Pools</h1>
      <ul>
        {pools.map((pool) => {
          const isActive = pool.id === activePoolId

          if (renamingId === pool.id) {
            return (
              <li key={pool.id}>
                <input
                  value={renameValue}
                  onChange={(e) => {
                    setRenameValue(e.target.value)
                    setRenameError(null)
                  }}
                  aria-label={`Rename ${pool.name}`}
                />
                {renameError === 'empty' && <span role="alert">Name can't be empty.</span>}
                {renameError === 'duplicate' && (
                  <span role="alert">A pool with that name already exists.</span>
                )}
                <button type="button" onClick={() => handleRenameSubmit(pool.id)}>
                  Save
                </button>
                <button type="button" onClick={() => setRenamingId(null)}>
                  Cancel
                </button>
              </li>
            )
          }

          return (
            <li key={pool.id}>
              <button
                type="button"
                onClick={() => handleSelect(pool.id)}
                aria-current={isActive}
                aria-label={isActive ? `Active pool: ${pool.name}. Tap to switch.` : `Switch to ${pool.name}`}
              >
                {pool.name}
                {isActive && <span> (active)</span>}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRenamingId(pool.id)
                  setRenameValue(pool.name)
                }}
              >
                Rename
              </button>
              <button type="button" onClick={() => setConfirmDeleteId(pool.id)}>
                Delete
              </button>
            </li>
          )
        })}
      </ul>

      <AddPoolForm onSuccess={() => reset('home')} />

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title={`Delete ${poolPendingDelete?.name ?? ''}?`}
        description={`${poolPendingDelete?.name ?? 'This pool'} and all of its meal ideas will be permanently deleted.${
          pools.length === 1
            ? ' A new empty "Dinner" pool will be created since at least one pool must always exist.'
            : ''
        }`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (confirmDeleteId) await deletePool(confirmDeleteId)
          setConfirmDeleteId(null)
        }}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </main>
  )
}
