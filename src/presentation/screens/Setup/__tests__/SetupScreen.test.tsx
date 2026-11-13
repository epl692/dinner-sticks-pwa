import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { useFamilyStore } from '../../../../state/useFamilyStore'
import { SetupScreen } from '../SetupScreen'

const createFamily = vi.fn(async () => {})
const joinFamily = vi.fn(async () => {})

beforeEach(() => {
  createFamily.mockClear()
  joinFamily.mockClear()
  useFamilyStore.setState({
    phase: 'setup',
    displayName: null,
    incomingInvite: null,
    join: { status: 'idle', sas: null, error: null },
    createFamily,
    joinFamily,
  })
})

describe('SetupScreen', () => {
  it('has no axe violations', async () => {
    const { container } = render(<SetupScreen />)
    expect((await axe(container)).violations).toEqual([])
  })

  it('starts a family with the entered names', async () => {
    const user = userEvent.setup()
    render(<SetupScreen />)
    await user.type(screen.getByLabelText('Your name'), 'Alex')
    await user.click(screen.getByRole('button', { name: 'Start a new family' }))
    expect(createFamily).toHaveBeenCalledWith('Alex', 'Our Family')
  })

  it('asks for a name before starting', async () => {
    const user = userEvent.setup()
    render(<SetupScreen />)
    await user.click(screen.getByRole('button', { name: 'Start a new family' }))
    expect(createFamily).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/enter your name/i)
  })

  it('opens on the join form, prefilled, when the app was opened from an invite link', async () => {
    useFamilyStore.setState({ incomingInvite: 'https://example.test/#/join/abc' })
    const user = userEvent.setup()
    render(<SetupScreen />)
    expect(screen.getByLabelText('Invite link')).toHaveValue('https://example.test/#/join/abc')
    await user.type(screen.getByLabelText('Your name'), 'Blake')
    await user.click(screen.getByRole('button', { name: 'Join this family' }))
    expect(joinFamily).toHaveBeenCalledWith('Blake', 'https://example.test/#/join/abc')
  })

  it('shows the five words while waiting for approval, and the error if joining fails', () => {
    useFamilyStore.setState({ join: { status: 'waiting', sas: 'a-b-c-d-e', error: null } })
    const { rerender } = render(<SetupScreen />)
    expect(screen.getByRole('status')).toHaveTextContent('a-b-c-d-e')
    useFamilyStore.setState({ join: { status: 'failed', sas: null, error: 'expired' } })
    rerender(<SetupScreen />)
    expect(screen.getByRole('alert')).toHaveTextContent('expired')
  })
})
