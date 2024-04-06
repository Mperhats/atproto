import { Selectable } from 'kysely'

export interface Merchant {
  did: string
  handle: string | null
  createdAt: string
  takedownRef: string | null
  deactivatedAt: string | null
  deleteAfter: string | null
}

export type MerchantEntry = Selectable<Merchant>

export const tableName = 'merchant'

export type PartialDB = { [tableName]: Merchant }
