export interface MerchantState {
  did: string
  lastSeenNotifs: string
}

export const tableName = 'merchant_state'

export type PartialDB = { [tableName]: MerchantState }
