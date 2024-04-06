import { DataPlaneClient } from '../data-plane/client'
import { Record as MerchantProfileRecord } from '../lexicon/types/app/bsky/merchant/merchantProfile'
import {
  HydrationMap,
  parseRecordBytes,
  parseString,
  safeTakedownRef,
} from './util'

export type Merchant = {
  did: string
  handle?: string
  merchantProfile?: MerchantProfileRecord
  profileCid?: string
  profileTakedownRef?: string
  sortedAt?: Date
  takedownRef?: string
  isLabeler: boolean
}

export type Merchants = HydrationMap<Merchant>

export type ProfileViewerState = {
  muted?: boolean
  mutedByList?: string
  blockedBy?: string
  blocking?: string
  blockedByList?: string
  blockingByList?: string
  following?: string
  followedBy?: string
}

export type ProfileViewerStates = HydrationMap<ProfileViewerState>

export type ProfileAgg = {
  followers: number
  follows: number
  posts: number
  lists: number
  feeds: number
}

export type ProfileAggs = HydrationMap<ProfileAgg>

export class MerchantHydrator {
  constructor(public dataplane: DataPlaneClient) {}

  async getRepoRevSafe(did: string | null): Promise<string | null> {
    if (!did) return null
    try {
      const res = await this.dataplane.getLatestRev({ actorDid: did })
      return parseString(res.rev) ?? null
    } catch {
      return null
    }
  }

  async getDids(handleOrDids: string[]): Promise<(string | undefined)[]> {
    const handles = handleOrDids.filter(
      (merchant) => !merchant.startsWith('did:'),
    )
    const res = handles.length
      ? await this.dataplane.getDidsByHandles({ handles })
      : { dids: [] }
    const didByHandle = handles.reduce(
      (acc, cur, i) => {
        const did = res.dids[i]
        if (did && did.length > 0) {
          return acc.set(cur, did)
        }
        return acc
      },
      new Map() as Map<string, string>,
    )
    return handleOrDids.map((id) =>
      id.startsWith('did:') ? id : didByHandle.get(id),
    )
  }

  async getDidsDefined(handleOrDids: string[]): Promise<string[]> {
    const res = await this.getDids(handleOrDids)
    // @ts-ignore
    return res.filter((did) => did !== undefined)
  }

  async getMerchants(
    dids: string[],
    includeTakedowns = false,
  ): Promise<Merchants> {
    if (!dids.length) return new HydrationMap<Merchant>()
    const res = await this.dataplane.getMerchants({ dids })
    return dids.reduce((acc, did, i) => {
      const merchant = res.merchants[i]
      if (
        !merchant.exists ||
        (merchant.takenDown && !includeTakedowns) ||
        !!merchant.tombstonedAt
      ) {
        return acc.set(did, null)
      }
      const profile =
        includeTakedowns || !merchant.profile?.takenDown
          ? merchant.profile
          : undefined
      return acc.set(did, {
        did,
        handle: parseString(merchant.handle),
        merchantProfile: parseRecordBytes<MerchantProfileRecord>(profile?.record),
        profileCid: profile?.cid,
        profileTakedownRef: safeTakedownRef(profile),
        sortedAt: profile?.sortedAt?.toDate(),
        takedownRef: safeTakedownRef(merchant),
        isLabeler: merchant.labeler ?? false,
      })
    }, new HydrationMap<Merchant>())
  }

  // "naive" because this method does not verify the existence of the list itself
  // a later check in the main hydrator will remove list uris that have been deleted or
  // repurposed to "curate lists"
  async getProfileViewerStatesNaive(
    dids: string[],
    viewer: string,
  ): Promise<ProfileViewerStates> {
    if (!dids.length) return new HydrationMap<ProfileViewerState>()
    const res = await this.dataplane.getRelationships({
      actorDid: viewer,
      targetDids: dids,
    })
    return dids.reduce((acc, did, i) => {
      const rels = res.relationships[i]
      if (viewer === did) {
        // ignore self-follows, self-mutes, self-blocks
        return acc.set(did, {})
      }
      return acc.set(did, {
        muted: rels.muted ?? false,
        mutedByList: parseString(rels.mutedByList),
        blockedBy: parseString(rels.blockedBy),
        blocking: parseString(rels.blocking),
        blockedByList: parseString(rels.blockedByList),
        blockingByList: parseString(rels.blockingByList),
        following: parseString(rels.following),
        followedBy: parseString(rels.followedBy),
      })
    }, new HydrationMap<ProfileViewerState>())
  }

  async getProfileAggregates(dids: string[]): Promise<ProfileAggs> {
    if (!dids.length) return new HydrationMap<ProfileAgg>()
    const counts = await this.dataplane.getCountsForUsers({ dids })
    return dids.reduce((acc, did, i) => {
      return acc.set(did, {
        followers: counts.followers[i] ?? 0,
        follows: counts.following[i] ?? 0,
        posts: counts.posts[i] ?? 0,
        lists: counts.lists[i] ?? 0,
        feeds: counts.feeds[i] ?? 0,
      })
    }, new HydrationMap<ProfileAgg>())
  }
}
