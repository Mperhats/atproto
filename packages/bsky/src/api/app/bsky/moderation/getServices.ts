import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'
import { mapDefined } from '@atproto/common'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.moderation.getServices({
    auth: ctx.authVerifier.standardOptional,
    handler: async ({ params, auth, req }) => {
      const { dids } = params
      const viewer = auth.credentials.iss
      const labelers = ctx.reqLabelers(req)

      const hydration = await ctx.hydrator.hydrateModServices(dids, {
        viewer,
        labelers,
      })

      const views = mapDefined(dids, (did) =>
        ctx.views.modService(did, hydration),
      )

      return {
        encoding: 'application/json',
        body: {
          views,
        },
      }
    },
  })
}