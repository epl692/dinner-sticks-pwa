import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_RELAY_URL, getRelay, parseRelayUrl, setChosenRelay } from '../relayConfig'

afterEach(() => localStorage.clear())

describe('parseRelayUrl', () => {
  it('accepts wss:// and ws:// addresses', () => {
    expect(parseRelayUrl('wss://sync.example.com', true)).toEqual({
      ok: true,
      url: 'wss://sync.example.com',
    })
    expect(parseRelayUrl('ws://192.168.1.5:8787', false)).toEqual({
      ok: true,
      url: 'ws://192.168.1.5:8787',
    })
  })

  it('assumes a bare host is secure and converts http(s)', () => {
    expect(parseRelayUrl('sync.example.com', true)).toEqual({
      ok: true,
      url: 'wss://sync.example.com',
    })
    expect(parseRelayUrl('https://sync.example.com/sync', true)).toEqual({
      ok: true,
      url: 'wss://sync.example.com/sync',
    })
    expect(parseRelayUrl('http://localhost:8787', false)).toEqual({
      ok: true,
      url: 'ws://localhost:8787',
    })
  })

  it('refuses ws:// to another machine from an HTTPS page, but allows this machine', () => {
    expect(parseRelayUrl('ws://192.168.1.5:8787', true).ok).toBe(false)
    expect(parseRelayUrl('ws://localhost:8787', true).ok).toBe(true)
  })

  it('rejects empty input and other schemes', () => {
    expect(parseRelayUrl('   ', false).ok).toBe(false)
    expect(parseRelayUrl('ftp://example.com', false).ok).toBe(false)
  })
})

describe('getRelay', () => {
  it('falls back to the default, and a chosen server wins until it is reset', () => {
    expect(getRelay()).toEqual({ url: DEFAULT_RELAY_URL, source: 'default' })
    setChosenRelay('wss://mine.example.com')
    expect(getRelay()).toEqual({ url: 'wss://mine.example.com', source: 'chosen' })
    setChosenRelay(null)
    expect(getRelay().source).toBe('default')
  })

  it('ignores a corrupt stored value', () => {
    localStorage.setItem('dinner-sticks:relay-url', 'not a url at all ::')
    expect(getRelay().source).toBe('default')
  })
})
