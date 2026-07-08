export interface Pool {
  id: string
  name: string
  createdAt: number
}

export function createPool(name: string): Pool {
  return {
    id: crypto.randomUUID(),
    name,
    createdAt: Date.now(),
  }
}
