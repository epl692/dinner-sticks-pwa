import { useState, type FormEvent } from 'react'

type FieldError = 'empty' | 'duplicate'
type SubmitResult = { ok: true } | { ok: false; error: FieldError }

interface StickEditorFormProps {
  initialName?: string
  submitLabel: string
  onSubmit: (name: string) => Promise<SubmitResult>
  onSuccess: () => void
  onCancel: () => void
}

/** Shared pattern for both Add and Edit (§5 "Stick Editor"): single name field,
 * validated non-empty and non-duplicate-within-pool, inline error. */
export function StickEditorForm({
  initialName = '',
  submitLabel,
  onSubmit,
  onSuccess,
  onCancel,
}: StickEditorFormProps) {
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<FieldError | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await onSubmit(name)
    setSubmitting(false)
    if (result.ok) {
      onSuccess()
    } else {
      setError(result.error)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="stick-name">Meal idea name</label>
      <input
        id="stick-name"
        type="text"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        aria-invalid={error !== null}
        aria-describedby={error ? 'stick-name-error' : undefined}
      />
      {error === 'empty' && (
        <p id="stick-name-error" role="alert">
          Name can't be empty.
        </p>
      )}
      {error === 'duplicate' && (
        <p id="stick-name-error" role="alert">
          That name is already used in this pool.
        </p>
      )}
      <div className="dialog-actions">
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" disabled={submitting}>
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
