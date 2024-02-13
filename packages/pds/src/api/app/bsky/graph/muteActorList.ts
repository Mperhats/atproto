import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.graph.muteActorList({
    auth: ctx.authVerifier.access,
    handler: async ({ auth, input, req }) => {
      const requester = auth.credentials.did

      await ctx.appViewAgent.api.app.bsky.graph.muteActorList(input.body, {
        ...(await ctx.appviewAuthHeaders(requester, req)),
        encoding: 'application/json',
      })
    },
  })
}
