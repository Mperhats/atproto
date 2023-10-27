import { InvalidRequestError } from '@atproto/xrpc-server'
import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.server.requestAccountDelete({
    auth: ctx.authVerifier.accessCheckTakedown,
    handler: async ({ auth }) => {
      const did = auth.credentials.did
      const account = await ctx.accountManager.getAccount(did)
      if (!account) {
        throw new InvalidRequestError('account not found')
      }
      if (!account.email) {
        throw new InvalidRequestError('account does not have an email address')
      }
      const token = await ctx.accountManager.createEmailToken(
        did,
        'delete_account',
      )
      await ctx.mailer.sendAccountDelete({ token }, { to: account.email })
    },
  })
}
