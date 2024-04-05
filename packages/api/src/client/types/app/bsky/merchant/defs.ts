/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { ValidationResult, BlobRef } from '@atproto/lexicon'
import { isObj, hasProp } from '../../../../util'
import { lexicons } from '../../../../lexicons'
import { CID } from 'multiformats/cid'
import * as ComAtprotoLabelDefs from '../../../com/atproto/label/defs'

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
