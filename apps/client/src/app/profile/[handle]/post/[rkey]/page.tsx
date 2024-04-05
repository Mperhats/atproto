// src/app/profile/[handle]/post/[rkey]/page.tsx
import { AppBskyFeedDefs, AppBskyFeedPost } from '@atproto/api'

import { agent } from '~/lib/api'

interface Props {
  params: {
    handle: string
    rkey: string
  }
}

export default async function PostView({ params }: Props) {
  const uri = `at://${decodeURIComponent(params.handle)}/app.bsky.feed.post/${
    params.rkey
  }`

  const thread = await agent.app.bsky.feed.getPostThread({ uri })

  if (!AppBskyFeedDefs.isThreadViewPost(thread.data.thread))
    throw new Error('Expected a thread view post')

  const post = thread.data.thread.post

  if (!AppBskyFeedPost.isRecord(post.record))
    throw new Error('Expected a post with a record')

  return (
    <div className="grid min-h-screen place-items-center">
      <div className="w-full max-w-sm">
        <div className="flex flex-row items-center">
          <img
            src={post.author.avatar}
            alt={post.author.handle}
            className="h-12 w-12 rounded-full"
          />
          <div className="ml-4">
            <p className="text-lg font-medium">{post.author.displayName}</p>
            <p>@{post.author.handle}</p>
          </div>
        </div>
        <div className="mt-4">
          <p>{post.record.text}</p>
        </div>
      </div>
    </div>
  )
}
