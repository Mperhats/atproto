import { InvalidRequestError } from '@atproto/xrpc-server'
import { Server } from '../../../../lexicon'
import { QueryParams } from '../../../../lexicon/types/app/bsky/merchant/getMerchant'
import AppContext from '../../../../context'
import { resHeaders } from '../../../util'
import { createPipeline, noRules } from '../../../../pipeline'
import {
  HydrateCtx,
  HydrationState,
  Hydrator,
} from '../../../../hydration/hydrator'
import { Views } from '../../../../views'

export default function (server: Server, ctx: AppContext) {
  const skeleton = async (input: {
    ctx: Context
    params: Params
  }): Promise<SkeletonState> => {
    const { ctx, params } = input
    const [did] = await ctx.hydrator.merchant.getDids([params.merchant])
    if (!did) {
      throw new InvalidRequestError('Profile not found')
    }
    return { did }
  }

  const hydration = async (input: {
    ctx: Context
    params: Params
    skeleton: SkeletonState
  }) => {
    const { ctx, params, skeleton } = input
    return ctx.hydrator.hydrateMerchants(
      [skeleton.did],
      params.hydrateCtx.copy({ includeTakedowns: true }),
    )
  }
  // presentation definition defines a type definition for a view. similar to a dto.
  const presentation = (input: {
    ctx: Context
    params: Params
    skeleton: SkeletonState
    hydration: HydrationState
  }) => {
    const { ctx, skeleton, hydration } = input
    const profile = ctx.views.merchant(skeleton.did, hydration)
    if (!profile) {
      throw new InvalidRequestError('Profile not found')
    }
    return profile
  }

  type Context = {
    hydrator: Hydrator
    views: Views
  }

  type Params = QueryParams & {
    hydrateCtx: HydrateCtx
  }

  type SkeletonState = { did: string }

  const getMerchant = createPipeline(skeleton, hydration, noRules, presentation)
  server.app.bsky.merchant.getMerchant({
    auth: ctx.authVerifier.optionalStandardOrRole,
    handler: async ({ auth, params, req }) => {
      const { viewer, includeTakedowns } = ctx.authVerifier.parseCreds(auth)
      const labelers = ctx.reqLabelers(req)
      const hydrateCtx = await ctx.hydrator.createContext({
        labelers,
        viewer,
        includeTakedowns,
      })

      const result = await getMerchant({ ...params, hydrateCtx }, ctx)

      const repoRev = await ctx.hydrator.merchant.getRepoRevSafe(viewer)

      return {
        encoding: 'application/json',
        body: result,
        headers: resHeaders({
          repoRev,
          labelers: hydrateCtx.labelers,
        }),
      }
    },
  })
}
