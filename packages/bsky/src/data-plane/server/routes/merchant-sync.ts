import { ServiceImpl } from '@connectrpc/connect'
import { Service } from '../../../proto/bsky_connect'
import { Database } from '../db'

export default (db: Database): Partial<ServiceImpl<typeof Service>> => ({
  async getLatestMerchantRev(req) {
    const res = await db.db
      .selectFrom('merchant_sync')
      .where('did', '=', req.merchantDid)
      .select('repoRev')
      .executeTakeFirst()
    return {
      rev: res?.repoRev ?? undefined,
    }
  },
})
