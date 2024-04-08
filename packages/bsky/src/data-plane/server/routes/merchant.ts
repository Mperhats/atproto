import { ServiceImpl } from '@connectrpc/connect'
import { Service } from '../../../proto/bsky_connect'
import { keyBy } from '@atproto/common'
import { getRecords } from './records'
import { Database } from '../db'
import { sql } from 'kysely'

export default (db: Database): Partial<ServiceImpl<typeof Service>> => ({
  async getMerchants(req) {
    const { dids } = req
    if (dids.length === 0) {
      return { merchants: [] }
    }
    const profileUris = dids.map(
      (did) => `at://${did}/app.bsky.merchant.merchantProfile/self`,
    )

    const { ref } = db.db.dynamic
    const [handlesRes, profiles] = await Promise.all([
      db.db
        .selectFrom('merchant')
        .where('did', 'in', dids)
        .selectAll('merchant')
        .select([
          db.db
            .selectFrom('labeler')
            .whereRef('creator', '=', ref('merchant.did'))
            .select(sql<true>`${true}`.as('val'))
            .as('isLabeler'),
        ])
        .execute(),
      getRecords(db)({ uris: profileUris }),
    ])

    const byDid = keyBy(handlesRes, 'did')
    const merchants = dids.map((did, i) => {
      const row = byDid[did]
      return {
        exists: !!row,
        handle: row?.handle ?? undefined,
        merchantProfile: profiles.records[i],
        takenDown: !!row?.takedownRef,
        takedownRef: row?.takedownRef || undefined,
        tombstonedAt: undefined, // in current implementation, tombstoned actors are deleted
        labeler: row?.isLabeler ?? false,
      }
    })
    return { merchants }
  },

  async getDidsByHandles(req) {
    const { handles } = req
    if (handles.length === 0) {
      return { dids: [] }
    }
    const res = await db.db
      .selectFrom('merchant')
      .where('handle', 'in', handles)
      .selectAll()
      .execute()
    const byHandle = keyBy(res, 'handle')
    const dids = handles.map((handle) => byHandle[handle]?.did ?? '')
    return { dids }
  },
})
