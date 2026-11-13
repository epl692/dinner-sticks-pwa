import { useState, type FormEvent } from 'react'
import { useFamilyStore } from '../../../state/useFamilyStore'
import { RelaySettings } from '../shared/RelaySettings'

/**
 * First launch (and after leaving a family): no account, no password. Say who you are, then
 * either start a family or join one with an invite link from a family member.
 */
export function SetupScreen() {
  const savedName = useFamilyStore((s) => s.displayName)
  const incomingInvite = useFamilyStore((s) => s.incomingInvite)
  const join = useFamilyStore((s) => s.join)
  const createFamily = useFamilyStore((s) => s.createFamily)
  const joinFamily = useFamilyStore((s) => s.joinFamily)

  const [mode, setMode] = useState<'start' | 'join'>(incomingInvite ? 'join' : 'start')
  const [name, setName] = useState(savedName ?? '')
  const [familyName, setFamilyName] = useState('Our Family')
  const [invite, setInvite] = useState(incomingInvite ?? '')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const waiting = join.status === 'waiting'

  async function handleStart(e: FormEvent) {
    e.preventDefault()
    if (!name.trim())
      return setFormError('Enter your name so your family can see who changed what.')
    if (!familyName.trim()) return setFormError('Enter a name for your family.')
    setBusy(true)
    setFormError(null)
    try {
      await createFamily(name, familyName)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return setFormError('Enter your name so your family knows who is joining.')
    if (!invite.trim()) return setFormError('Paste the invite link a family member sent you.')
    setFormError(null)
    await joinFamily(name, invite)
  }

  return (
    <main>
      <h1>Dinner Sticks</h1>
      <p>
        Share your meal ideas and weekly plan with your family. There are no accounts or passwords:
        everything is encrypted on your devices and only people you invite can read it.
      </p>

      <div role="group" aria-label="What would you like to do?" className="segmented">
        <button type="button" aria-pressed={mode === 'start'} onClick={() => setMode('start')}>
          Start a family
        </button>
        <button type="button" aria-pressed={mode === 'join'} onClick={() => setMode('join')}>
          Join a family
        </button>
      </div>

      <label htmlFor="setup-name">Your name</label>
      <input
        id="setup-name"
        type="text"
        autoComplete="given-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        disabled={busy || waiting}
      />

      {mode === 'start' ? (
        <form onSubmit={handleStart}>
          <label htmlFor="setup-family-name">Family name</label>
          <input
            id="setup-family-name"
            type="text"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            disabled={busy}
          />
          <button type="submit" disabled={busy}>
            Start a new family
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin}>
          <label htmlFor="setup-invite">Invite link</label>
          <input
            id="setup-invite"
            type="text"
            inputMode="url"
            autoComplete="off"
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            disabled={waiting}
          />
          <button type="submit" disabled={waiting}>
            Join this family
          </button>
        </form>
      )}

      {formError && <p role="alert">{formError}</p>}

      {waiting && (
        <div role="status">
          <p>Waiting for a family owner to let you in. They need to have the app open.</p>
          {join.sas && (
            <p>
              Tell them these five words so they know it's you: <strong>{join.sas}</strong>
            </p>
          )}
        </div>
      )}
      {join.status === 'failed' && (
        <p role="alert">
          Couldn't join: {join.error ?? 'the invite did not work.'} Ask for a new invite link and
          try again.
        </p>
      )}
      <RelaySettings />
    </main>
  )
}
