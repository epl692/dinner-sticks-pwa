import { useEffect, useMemo, useState } from 'react'
import { qrToSvg } from '@sync/identity-invite'
import { useFamilyStore } from '../../../state/useFamilyStore'
import { LINK_TEXT } from './linkText'
import { findLegacyLibrary, uploadLegacyLibrary } from '../../../state/legacyMigration'
import type { LegacyLibrary } from '../../../data/legacy/legacyDb'
import { useNoticeStore } from '../../../state/useNoticeStore'
import { usePoolsStore } from '../../../state/usePoolsStore'
import { useNavigationStack } from '../../navigation/useNavigationStack'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { RelaySettings } from '../shared/RelaySettings'

export function FamilyScreen() {
  const pop = useNavigationStack((s) => s.pop)
  const familyName = useFamilyStore((s) => s.familyName)
  const members = useFamilyStore((s) => s.members)
  const myRole = useFamilyStore((s) => s.myRole)
  const userId = useFamilyStore((s) => s.userId)
  const link = useFamilyStore((s) => s.link)
  const invite = useFamilyStore((s) => s.invite)
  const createInvite = useFamilyStore((s) => s.createInvite)
  const removeMember = useFamilyStore((s) => s.removeMember)
  const makeOwner = useFamilyStore((s) => s.makeOwner)
  const leaveFamily = useFamilyStore((s) => s.leaveFamily)
  const refreshMembers = useFamilyStore((s) => s.refreshMembers)
  const showNotice = useNoticeStore((s) => s.show)

  const [removeTarget, setRemoveTarget] = useState<{ id: string; name: string } | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [legacy, setLegacy] = useState<LegacyLibrary | null>(null)
  const [inviteBusy, setInviteBusy] = useState(false)

  useEffect(() => {
    void refreshMembers()
    void findLegacyLibrary().then((found) => {
      if (found && found.decision !== 'uploaded') setLegacy(found.library)
    })
  }, [refreshMembers])

  const isOwner = myRole === 'owner'
  const qrSrc = useMemo(
    () =>
      invite ? `data:image/svg+xml;utf8,${encodeURIComponent(qrToSvg(invite.qrPayload))}` : null,
    [invite],
  )

  async function handleInvite() {
    setInviteBusy(true)
    try {
      await createInvite()
    } catch (err) {
      showNotice(`Couldn't create an invite: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setInviteBusy(false)
    }
  }

  async function handleShare() {
    if (!invite) return
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Join our Dinner Sticks family', url: invite.url })
      } else {
        await navigator.clipboard.writeText(invite.url)
        showNotice('Invite link copied.')
      }
    } catch {
      // the share sheet was dismissed; nothing to do
    }
  }

  async function guarded(action: () => Promise<void>) {
    try {
      await action()
    } catch (err) {
      showNotice(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleUploadLegacy() {
    if (!legacy) return
    await guarded(async () => {
      const result = await uploadLegacyLibrary(legacy)
      setLegacy(null)
      await usePoolsStore.getState().loadPools()
      showNotice(`Added ${result.sticks} meal ideas from this device to ${familyName}.`)
    })
  }

  return (
    <main>
      <button type="button" onClick={pop} aria-label="Back">
        ← Back
      </button>
      <h1>{familyName}</h1>
      <p role="status">{LINK_TEXT[link]}</p>

      <section aria-labelledby="family-members-heading">
        <h2 id="family-members-heading">Family members</h2>
        <ul>
          {members.map((m) => {
            const name = m.displayName?.trim() || 'Unnamed'
            const isMe = m.user === userId
            return (
              <li key={m.user}>
                <span>
                  {name}
                  {isMe ? ' (you)' : ''} — {m.role === 'owner' ? 'Owner' : 'Member'}
                </span>
                {isOwner && !isMe && (
                  <>
                    {m.role !== 'owner' && (
                      <button
                        type="button"
                        onClick={() => guarded(() => makeOwner(m.user))}
                        aria-label={`Make ${name} an owner`}
                      >
                        Make owner
                      </button>
                    )}
                    <button
                      type="button"
                      className="destructive"
                      onClick={() => setRemoveTarget({ id: m.user, name })}
                      aria-label={`Remove ${name} from the family`}
                    >
                      Remove
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {isOwner && (
        <section aria-labelledby="family-invite-heading">
          <h2 id="family-invite-heading">Invite someone</h2>
          <p>
            An invite link works once and expires in 7 days. You'll be asked to approve the person
            when they use it, so keep this app open.
          </p>
          <button type="button" onClick={handleInvite} disabled={inviteBusy}>
            {invite ? 'Create a new invite link' : 'Create an invite link'}
          </button>
          {invite && qrSrc && (
            <div>
              <img
                src={qrSrc}
                width={220}
                height={220}
                alt="QR code for the invite link. Scan it with the other person's phone."
              />
              <label htmlFor="family-invite-link">Invite link</label>
              <input id="family-invite-link" type="text" readOnly value={invite.url} />
              <button type="button" onClick={handleShare}>
                {typeof navigator !== 'undefined' && 'share' in navigator
                  ? 'Share invite'
                  : 'Copy invite link'}
              </button>
            </div>
          )}
        </section>
      )}

      {legacy && (
        <section aria-labelledby="family-legacy-heading">
          <h2 id="family-legacy-heading">Meals saved on this device</h2>
          <p>
            This device has {legacy.sticks.length} meal ideas from before sharing was added. Add
            them to {familyName}? Nothing already in the family is changed.
          </p>
          <button type="button" onClick={handleUploadLegacy}>
            Add them to the family
          </button>
        </section>
      )}

      <RelaySettings />

      <section aria-labelledby="family-leave-heading">
        <h2 id="family-leave-heading">Leave</h2>
        <button type="button" className="destructive" onClick={() => setLeaving(true)}>
          Leave this family
        </button>
      </section>

      <ConfirmDialog
        open={removeTarget !== null}
        title={`Remove ${removeTarget?.name ?? ''}?`}
        description="They will stop seeing new changes, and the family's encryption keys are changed so they can't read anything added after this."
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          const target = removeTarget
          setRemoveTarget(null)
          if (target) void guarded(() => removeMember(target.id))
        }}
        onCancel={() => setRemoveTarget(null)}
      />
      <ConfirmDialog
        open={leaving}
        title="Leave this family?"
        description="This device stops syncing with the family. To come back, someone needs to send you a new invite."
        confirmLabel="Leave"
        destructive
        onConfirm={() => {
          setLeaving(false)
          void guarded(async () => {
            await leaveFamily()
            useNavigationStack.getState().reset('home')
          })
        }}
        onCancel={() => setLeaving(false)}
      />
    </main>
  )
}
