import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { axe } from 'vitest-axe'
import { useFamilyStore } from '../../../../state/useFamilyStore'
import { DEFAULT_RELAY_URL, getRelay } from '../../../../sync/relayConfig'
import { RelaySettings } from '../RelaySettings'

beforeEach(() => {
  useFamilyStore.setState({ session: null, relay: getRelay() })
})
afterEach(() => localStorage.clear())

async function open() {
  const user = userEvent.setup()
  render(<RelaySettings />)
  await user.click(screen.getByText('Sync server'))
  return user
}

describe('RelaySettings', () => {
  it('has no axe violations', async () => {
    const { container } = render(<RelaySettings />)
    expect((await axe(container)).violations).toEqual([])
  })

  it('shows the current server and where it came from', async () => {
    await open()
    expect(screen.getByLabelText('Sync server address')).toHaveValue(DEFAULT_RELAY_URL)
    expect(screen.getByText(/the default\)/)).toBeInTheDocument()
  })

  it('switches to a new server and can go back to the default', async () => {
    const user = await open()
    const input = screen.getByLabelText('Sync server address')
    await user.clear(input)
    await user.type(input, 'sync.mine.example')
    await user.click(screen.getByRole('button', { name: 'Use this server' }))
    expect(getRelay()).toEqual({ url: 'wss://sync.mine.example', source: 'chosen' })
    expect(screen.getByRole('status')).toHaveTextContent('wss://sync.mine.example')

    await user.click(screen.getByRole('button', { name: 'Go back to the default' }))
    expect(getRelay().source).toBe('default')
    expect(screen.getByLabelText('Sync server address')).toHaveValue(DEFAULT_RELAY_URL)
  })

  it('explains an invalid address instead of saving it', async () => {
    const user = await open()
    const input = screen.getByLabelText('Sync server address')
    await user.clear(input)
    await user.type(input, 'ftp://nope')
    await user.click(screen.getByRole('button', { name: 'Use this server' }))
    expect(screen.getByRole('alert')).toHaveTextContent(/wss:\/\//)
    expect(getRelay().source).toBe('default')
  })
})
