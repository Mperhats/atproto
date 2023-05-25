import Database from '../../../db'
import { DbRef } from '../../../db/util'
import { NotEmptyArray } from '@atproto/common'
import { sql } from 'kysely'
import { ImageUriBuilder } from '../../../image/uri'
import { ProfileView } from '../../../lexicon/types/app/bsky/actor/defs'
import { List } from '../../db/tables/list'

export class GraphService {
  constructor(public db: Database, public imgUriBuilder: ImageUriBuilder) {}

  static creator(imgUriBuilder: ImageUriBuilder) {
    return (db: Database) => new GraphService(db, imgUriBuilder)
  }

  getListsQb(requester: string) {
    const { ref } = this.db.db.dynamic
    return this.db.db
      .selectFrom('list')
      .innerJoin('did_handle', 'did_handle.did', 'list.creator')
      .selectAll('list')
      .selectAll('did_handle')
      .select([
        this.db.db
          .selectFrom('list_block')
          .where('list_block.creator', '=', requester)
          .whereRef('list_block.subjectUri', '=', ref('list.uri'))
          .select('list_block.uri')
          .as('viewerBlocked'),
        this.db.db
          .selectFrom('list_mute')
          .where('list_mute.mutedByDid', '=', requester)
          .whereRef('list_mute.listUri', '=', ref('list.uri'))
          .select('list_mute.listUri')
          .as('viewerMuted'),
      ])
  }

  getListItemsQb() {
    return this.db.db
      .selectFrom('list_item')
      .innerJoin('did_handle as subject', 'subject.did', 'list_item.subjectDid')
      .selectAll('subject')
      .select(['list_item.cid as cid', 'list_item.createdAt as createdAt'])
  }

  blockQb(requester: string, refs: NotEmptyArray<DbRef>) {
    return this.actorBlockQb(requester, refs).union(
      // @TODO union all
      this.blockListQb(requester, refs),
    )
  }

  actorBlockQb(requester: string, refs: NotEmptyArray<DbRef>) {
    const subjectRefs = sql.join(refs)
    return this.db.db
      .selectFrom('actor_block')
      .where((qb) =>
        qb
          .where('actor_block.creator', '=', requester)
          .whereRef('actor_block.subjectDid', 'in', sql`(${subjectRefs})`),
      )
      .orWhere((qb) =>
        qb
          .where('actor_block.subjectDid', '=', requester)
          .whereRef('actor_block.creator', 'in', sql`(${subjectRefs})`),
      )
  }

  blockListQb(requester: string, refs: NotEmptyArray<DbRef>) {
    const subjectRefs = sql.join(refs)

    return this.db.db
      .selectFrom('list_block')
      .innerJoin('list', 'list.uri', 'list_block.subjectUri')
      .innerJoin('list_item', (join) =>
        join
          .onRef('list_item.creator', '=', 'list.creator')
          .onRef('list_item.listUri', '=', 'list.uri'),
      )
      .where((qb) =>
        qb
          .where('list_block.creator', '=', requester)
          .whereRef('list_item.subjectDid', 'in', sql`(${subjectRefs})`),
      )
      .orWhere((qb) =>
        qb
          .where('list_item.subjectDid', '=', requester)
          .whereRef('list_block.creator', 'in', sql`(${subjectRefs})`),
      )
      .select([
        'list_block.creator as creator',
        'list_item.subjectDid as subjectDid',
      ])
  }

  async getBlocks(
    requester: string,
    subjectHandleOrDid: string,
  ): Promise<{ blocking: boolean; blockedBy: boolean }> {
    let subjectDid
    if (subjectHandleOrDid.startsWith('did:')) {
      subjectDid = subjectHandleOrDid
    } else {
      const res = await this.db.db
        .selectFrom('did_handle')
        .where('handle', '=', subjectHandleOrDid)
        .select('did')
        .executeTakeFirst()
      if (!res) {
        return { blocking: false, blockedBy: false }
      }
      subjectDid = res.did
    }

    const accnts = [requester, subjectDid]
    const actorBlockReq = this.db.db
      .selectFrom('actor_block')
      .where('creator', 'in', accnts)
      .where('subjectDid', 'in', accnts)
      .selectAll()

    const listBlockReq = this.db.db
      .selectFrom('list_block')
      .innerJoin('list', 'list.uri', 'list_block.subjectUri')
      .innerJoin('list_item', (join) =>
        join
          .onRef('list_item.creator', '=', 'list.creator')
          .onRef('list_item.listUri', '=', 'list.uri'),
      )
      .where('list_block.creator', 'in', accnts)
      .where('list_item.subjectDid', 'in', accnts)
      .select([
        'list_block.creator as creator',
        'list_item.subjectDid as subjectDid',
      ])

    const [actorBlockRes, listBlockRes] = await Promise.all([
      actorBlockReq.execute(),
      listBlockReq.execute(),
    ])

    const blocking =
      actorBlockRes.some(
        (row) => row.creator === requester && row.subjectDid === subjectDid,
      ) ||
      listBlockRes.some(
        (row) => row.creator === requester && row.subjectDid === subjectDid,
      )
    const blockedBy =
      actorBlockRes.some(
        (row) => row.creator === subjectDid && row.subjectDid === requester,
      ) ||
      listBlockRes.some(
        (row) => row.creator === subjectDid && row.subjectDid === requester,
      )

    return {
      blocking,
      blockedBy,
    }
  }

  formatListView(list: ListInfo, profiles: Record<string, ProfileView>) {
    return {
      uri: list.uri,
      creator: profiles[list.creator],
      name: list.name,
      purpose: list.purpose,
      description: list.description ?? undefined,
      descriptionFacets: list.descriptionFacets
        ? JSON.parse(list.descriptionFacets)
        : undefined,
      avatar: list.avatarCid
        ? this.imgUriBuilder.getCommonSignedUri('avatar', list.avatarCid)
        : undefined,
      indexedAt: list.indexedAt,
      viewer: {
        muted: !!list.viewerMuted,
        blocked: list.viewerBlocked ?? undefined,
      },
    }
  }
}

type ListInfo = List & {
  viewerBlocked: string | null
  viewerMuted: string | null
}
