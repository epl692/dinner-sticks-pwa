import type {
  PeerInfo,
  Transport,
  TransportCapabilities,
  TransportEvents,
  TransportState,
} from '@sync/core'

type Handlers = { [K in keyof TransportEvents]: Set<TransportEvents[K]> }

/**
 * TEST ONLY. Two in-process transports wired to each other, so two cores (two "devices" of
 * one family) can sync without a relay. `link.up()` / `link.down()` simulate going on/offline.
 */
class End implements Transport {
  readonly id = 'test-link'
  readonly capabilities: TransportCapabilities = {
    maxMessageBytes: 64 * 1024 * 1024,
    ordered: true,
    multiPeer: false,
    blobs: false,
  }
  state: TransportState = 'idle'
  other!: End
  connected = false
  started = false
  private handlers: Handlers = {
    state: new Set(),
    peerConnected: new Set(),
    peerDisconnected: new Set(),
    message: new Set(),
    error: new Set(),
  }

  readonly name: string
  constructor(name: string) {
    this.name = name
  }

  supported() {
    return { ok: true as const }
  }

  on<K extends keyof TransportEvents>(event: K, handler: TransportEvents[K]): () => void {
    ;(this.handlers[event] as Set<TransportEvents[K]>).add(handler)
    return () => void (this.handlers[event] as Set<TransportEvents[K]>).delete(handler)
  }

  emit<K extends keyof TransportEvents>(event: K, ...args: Parameters<TransportEvents[K]>) {
    for (const h of this.handlers[event] as Set<(...a: unknown[]) => void>) h(...args)
  }

  async start(): Promise<void> {
    this.started = true
    this.state = 'ready'
    this.emit('state', this.state)
    this.refresh()
    this.other.refresh()
  }

  async stop(): Promise<void> {
    this.started = false
    this.state = 'idle'
    this.refresh()
    this.other.refresh()
  }

  async connect(): Promise<void> {
    await this.start()
  }

  linkUp = false

  refresh(): void {
    const up = this.started && this.other.started && this.linkUp
    if (up && !this.connected) {
      this.connected = true
      const info: PeerInfo = { id: this.other.name, label: this.other.name }
      this.emit('peerConnected', info)
    } else if (!up && this.connected) {
      this.connected = false
      this.emit('peerDisconnected', this.other.name, 'link down')
    }
  }

  async send(_peer: string, bytes: Uint8Array): Promise<void> {
    if (!this.connected) throw new Error('not connected')
    const copy = bytes.slice()
    queueMicrotask(() => {
      if (this.connected && this.other.connected) this.other.emit('message', this.name, copy)
    })
  }
}

export function createLink() {
  const a = new End('a')
  const b = new End('b')
  a.other = b
  b.other = a
  return {
    a: a as Transport,
    b: b as Transport,
    up() {
      a.linkUp = b.linkUp = true
      a.refresh()
      b.refresh()
    },
    down() {
      a.linkUp = b.linkUp = false
      a.refresh()
      b.refresh()
    },
  }
}
