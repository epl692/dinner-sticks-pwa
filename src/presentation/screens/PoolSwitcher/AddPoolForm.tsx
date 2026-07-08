import { useState, type FormEvent } from 'react'
import { usePoolsStore } from '../../../state/usePoolsStore'

interface AddPoolFormProps {
  onSuccess: () => void
}

export function AddPoolForm({ onSuccess }: AddPoolFormProps) {
  const addPool = usePoolsStore((s) => s.addPool)
  const [name, setName] = useState('')
  const [error, setError] = useState<'empty' | 'duplicate' | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const result = await addPool(name)
    if (result.ok) {
      setName('')
      onSuccess()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="pool-name">New pool name</label>
      <input
        id="pool-name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        aria-invalid={error !== null}
        aria-describedby={error ? 'pool-name-error' : undefined}
      />
      {error === 'empty' && (
        <p id="pool-name-error" role="alert">
          Name can't be empty.
        </p>
      )}
      {error === 'duplicate' && (
        <p id="pool-name-error" role="alert">
          A pool with that name already exists.
        </p>
      )}
      <button type="submit">Add pool</button>
    </form>
  )
}
