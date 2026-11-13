import {
  canonicalBytes,
  createMemoryStorage,
  createSyncCore,
  parseJsonBytes,
  type CodecContext,
  type DecodeResult,
  type PacketBody,
  type PayloadCodec,
  type SyncCore,
} from '@sync/core'
import type { Pool } from '../domain/entities/pool'
import type { Stick } from '../domain/entities/stick'
import type { WeeklyBin } from '../domain/entities/weeklyBin'
import { getAllPools } from '../data/repositories/poolRepository'
import { getAllSticks } from '../data/repositories/stickRepository'
import { getBinForPool } from '../data/repositories/weeklyBinRepository'
import { getDataContext, listObjects, setDataContext, TYPE } from '../sync/dataContext'

/**
 * TEST ONLY. Stores packet bodies as readable JSON with no encryption. The app never imports this
 * file; production builds register only the encrypting codec from @sync/spaces.
 */
export class TestPlaintextCodec implements PayloadCodec {
  readonly id = 'dinner-test-plaintext/1'
  async encode(body: PacketBody, _ctx: CodecContext): Promise<Uint8Array> {
    return canonicalBytes(body)
  }
  async decode(bytes: Uint8Array, _ctx: CodecContext): Promise<DecodeResult> {
    try {
      const o = parseJsonBytes(bytes) as PacketBody
      return { ok: true, body: { ...o, schemaVersion: o.schemaVersion ?? 1 } }
    } catch {
      return { ok: false, reason: 'malformed' }
    }
  }
}

export const TEST_SPACE = 'test-family-space'

/** A fresh in-memory core. Pass `deviceId` to simulate two devices of one family. */
export async function createTestCore(deviceId?: string): Promise<SyncCore> {
  return createSyncCore({
    storage: createMemoryStorage(),
    codecs: [new TestPlaintextCodec()],
    spaces: [TEST_SPACE],
    ...(deviceId ? { deviceId } : {}),
  })
}

/** Points the repositories at a brand-new, empty in-memory family. Called before every test. */
export async function installTestData(): Promise<SyncCore> {
  const core = await createTestCore()
  setDataContext({ core, space: TEST_SPACE })
  return core
}

async function clearType(type: string): Promise<void> {
  const { core } = getDataContext()
  for (const o of await listObjects(type)) await core.remove(o.id)
}

async function allBins(): Promise<WeeklyBin[]> {
  const poolIds = new Set((await listObjects(TYPE.bin)).map((o) => String(o.fields.poolId)))
  const bins: WeeklyBin[] = []
  for (const poolId of poolIds) {
    const bin = await getBinForPool(poolId)
    if (bin) bins.push(bin)
  }
  return bins
}

/**
 * Small read/clear surface over the repositories so tests can assert on what was persisted
 * without caring how the family Space stores it.
 */
export const testDb = {
  pools: {
    clear: () => clearType(TYPE.pool),
    toArray: (): Promise<Pool[]> => getAllPools(),
    count: async () => (await getAllPools()).length,
  },
  sticks: {
    clear: () => clearType(TYPE.stick),
    toArray: (): Promise<Stick[]> => getAllSticks(),
    count: async () => (await getAllSticks()).length,
  },
  weeklyBins: {
    clear: async () => {
      await clearType(TYPE.binItem)
      await clearType(TYPE.bin)
    },
    toArray: allBins,
    count: async () => (await allBins()).length,
    where: (_field: 'poolId') => ({
      equals: (poolId: string) => ({ first: () => getBinForPool(poolId) }),
    }),
  },
}
