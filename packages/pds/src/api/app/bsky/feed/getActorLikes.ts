import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'
import { OutputSchema } from '../../../../lexicon/types/app/bsky/feed/getAuthorFeed'
import { handleReadAfterWrite } from '../util/read-after-write'
import { authPassthru } from '../../../../api/com/atproto/admin/util'
import { LocalRecords } from '../../../../actor-store/local/reader'

export default function (server: Server, ctx: AppContext) {
  server.app.bsky.feed.getActorLikes({
    auth: ctx.accessOrRoleVerifier,
    handler: async ({ req, params, auth }) => {
      const requester =
        auth.credentials.type === 'access' ? auth.credentials.did : null

      const res = await ctx.appViewAgent.api.app.bsky.feed.getActorLikes(
        params,
        requester ? await ctx.serviceAuthHeaders(requester) : authPassthru(req),
      )
      if (requester) {
        return await handleReadAfterWrite(ctx, requester, res, getAuthorMunge)
      }
      return {
        encoding: 'application/json',
        body: res.data,
      }
    },
  })
}

const getAuthorMunge = async (
  ctx: AppContext,
  original: OutputSchema,
  local: LocalRecords,
  requester: string,
): Promise<OutputSchema> => {
  const actorStore = ctx.actorStore.reader(requester)
  const localProf = local.profile
  let feed = original.feed
  // first update any out of date profile pictures in feed
  if (localProf) {
    feed = feed.map((item) => {
      if (item.post.author.did === requester) {
        return {
          ...item,
          post: {
            ...item.post,
            author: actorStore.local.updateProfileViewBasic(
              item.post.author,
              localProf.record,
            ),
          },
        }
      } else {
        return item
      }
    })
  }
  return {
    ...original,
    feed,
  }
}