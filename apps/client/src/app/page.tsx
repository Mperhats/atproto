// src/app/page.tsx
import { ProfileView } from '@atproto/api/dist/client/types/app/bsky/actor/defs'

import { agent } from '~/lib/api'

export default async function Homepage() {
  const actor = await agent.app.bsky.actor.getProfile({
    actor: 'bob.test',
  })

  const actorComponent = (actor: ProfileView) => {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="w-full max-w-sm">
          <div className="flex flex-row items-center">
            <img src={actor.avatar} className="h-12 w-12 rounded-full" />
            <div className="ml-4">
              <p className="text-lg font-medium">{actor.displayName}</p>
              <p>@{actor.handle}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <h1 className="font-bold text-xl my-4">Top Feeds</h1>
      <ul>
        <div className="container mx-auto">{actorComponent(actor.data)}</div>
      </ul>
    </div>
  )
}
