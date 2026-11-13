import { useState, type FormEvent } from 'react'
import { DEFAULT_RELAY_URL, type RelaySource } from '../../../sync/relayConfig'
import { useFamilyStore } from '../../../state/useFamilyStore'

const SOURCE_TEXT: Record<RelaySource, string> = {
  chosen: 'chosen on this device',
  deployment: 'set by whoever hosts this app',
  build: 'set when this app was built',
  default: 'the default',
}

/**
 * Lets anyone point this device at a different sync server (for example one they run themselves).
 * Everyone in a family has to use the same server, and a server only ever sees encrypted data.
 */
export function RelaySettings() {
  const relay = useFamilyStore((s) => s.relay)
  const changeRelay = useFamilyStore((s) => s.changeRelay)
  const [value, setValue] = useState(relay.url)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaved(false)
    const result = await changeRelay(value)
    if (result.ok) {
      setError(null)
      setValue(useFamilyStore.getState().relay.url)
      setSaved(true)
    } else {
      setError(result.error)
    }
  }

  async function handleReset() {
    setSaved(false)
    const result = await changeRelay(null)
    if (result.ok) {
      setError(null)
      setValue(useFamilyStore.getState().relay.url)
      setSaved(true)
    } else {
      setError(result.error)
    }
  }

  return (
    <details className="relay-settings">
      <summary>Sync server</summary>
      <form onSubmit={handleSave}>
        <p>
          Currently <strong>{relay.url}</strong> ({SOURCE_TEXT[relay.source]}). Everyone in your
          family needs to use the same server. It only ever sees encrypted data. Your meals stay on
          this device when you switch.
        </p>
        <label htmlFor="relay-url">Sync server address</label>
        <input
          id="relay-url"
          type="text"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setSaved(false)
            setError(null)
          }}
          aria-invalid={error !== null}
          aria-describedby={error ? 'relay-url-error' : undefined}
        />
        {error && (
          <p id="relay-url-error" role="alert">
            {error}
          </p>
        )}
        {saved && <p role="status">Saved. Connecting to {relay.url}…</p>}
        <div className="dialog-actions">
          <button type="submit">Use this server</button>
          {relay.source === 'chosen' && (
            <button type="button" onClick={handleReset}>
              Go back to the default
            </button>
          )}
        </div>
        <p>The built-in default is {DEFAULT_RELAY_URL}.</p>
      </form>
    </details>
  )
}
