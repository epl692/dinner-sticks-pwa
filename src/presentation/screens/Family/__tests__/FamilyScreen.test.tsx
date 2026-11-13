import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { useFamilyStore } from '../../../../state/useFamilyStore'
import { FamilyScreen } from '../FamilyScreen'

const removeMember = vi.fn(async () => {})
const refreshMembers = vi.fn(async () => {})

function setFamily(role: 'owner' | 'editor') {
  useFamilyStore.setState({
    phase: 'ready',
    familyName: 'The Smiths',
    myRole: role,
    userId: 'me',
    link: 'online',
    invite: null,
    members: [
      { user: 'me', displayName: 'Alex', role, devices: [] },
      { user: 'them', displayName: 'Blake', role: 'editor', devices: [] },
    ],
    removeMember,
    refreshMembers,
  })
}

beforeEach(() => {
  removeMember.mockClear()
  setFamily('owner')
})

describe('FamilyScreen', () => {
  it('has no axe violations', async () => {
    const { container } = render(<FamilyScreen />)
    expect((await axe(container)).violations).toEqual([])
  })

  it('lists members and the connection state', () => {
    render(<FamilyScreen />)
    expect(screen.getByText(/Alex \(you\) — Owner/)).toBeInTheDocument()
    expect(screen.getByText(/Blake — Member/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/Connected/)
  })

  it('asks for confirmation before removing a member', async () => {
    const user = userEvent.setup()
    render(<FamilyScreen />)
    await user.click(screen.getByRole('button', { name: 'Remove Blake from the family' }))
    expect(removeMember).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: 'Remove Blake?' })
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(removeMember).toHaveBeenCalledWith('them')
  })

  it('only owners can invite or remove people', () => {
    setFamily('editor')
    render(<FamilyScreen />)
    expect(screen.queryByRole('button', { name: /invite link/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
  })
})
