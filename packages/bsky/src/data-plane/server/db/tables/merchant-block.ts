import { GeneratedAlways } from 'kysely'

export const tableName = 'merchant_block'
export interface MerchantBlock {
  uri: string
  cid: string
  creator: string
  subjectDid: string
  createdAt: string
  indexedAt: string
  sortAt: GeneratedAlways<string>
}

export type PartialDB = { [tableName]: MerchantBlock }
