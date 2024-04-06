export interface Merchant {
  did: string
  handle: string | null
  indexedAt: string
  takedownRef: string | null
}

export const tableName = 'merchant'

export type PartialDB = { [tableName]: Merchant }
