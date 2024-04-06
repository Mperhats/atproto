export interface MerchantSync {
  did: string
  commitCid: string
  commitDataCid: string
  repoRev: string | null
  rebaseCount: number
  tooBigCount: number
}

export const tableName = 'merchant_sync'

export type PartialDB = { [tableName]: MerchantSync }
