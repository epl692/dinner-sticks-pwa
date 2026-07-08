export interface Stick {
  id: string
  poolId: string
  name: string
  createdAt: number
}

export function createStick(poolId: string, name: string): Stick {
  return {
    id: crypto.randomUUID(),
    poolId,
    name: name.trim(),
    createdAt: Date.now(),
  }
}
