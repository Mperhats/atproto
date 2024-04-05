/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { lexicons } from '../../../../lexicons'
import { isObj, hasProp } from '../../../../util'
import { CID } from 'multiformats/cid'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'
import * as AppBskyGraphDefs from '../graph/defs'

export interface MerchantView {
  did: string
  handle: string
  displayName?: string
  description?: string
  avatar?: string
  indexedAt?: string
  viewer?: ViewerState
  labels?: ComAtprotoLabelDefs.Label[]
  [k: string]: unknown
}

export function isMerchantView(v: unknown): v is MerchantView {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'app.bsky.merchant.defs#merchantView'
  )
}

export function validateMerchantView(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.merchant.defs#merchantView', v)
}

/** Metadata about the requesting account's relationship with the subject account. Only has meaningful content for authed requests. */
export interface ViewerState {
  muted?: boolean
  mutedByList?: AppBskyGraphDefs.ListViewBasic
  blockedBy?: boolean
  blocking?: string
  blockingByList?: AppBskyGraphDefs.ListViewBasic
  following?: string
  followedBy?: string
  [k: string]: unknown
}

export function isViewerState(v: unknown): v is ViewerState {
  return (
    isObj(v) &&
    hasProp(v, '$type') &&
    v.$type === 'app.bsky.merchant.defs#viewerState'
  )
}

export function validateViewerState(v: unknown): ValidationResult {
  return lexicons.validate('app.bsky.merchant.defs#viewerState', v)
}
