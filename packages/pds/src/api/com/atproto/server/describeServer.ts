import { Server } from '../../../../lexicon'
import AppContext from '../../../../context'

export default function (server: Server, ctx: AppContext) {
  server.com.atproto.server.describeServer(async ({ req }) => {
    const availableUserDomains = ctx.cfg.identity.serviceHandleDomains
    const inviteCodeRequired = ctx.cfg.invites.required
    const privacyPolicy = ctx.cfg.service.privacyPolicyUrl
    const termsOfService = ctx.cfg.service.termsOfServiceUrl
    let phoneVerificationRequired = ctx.cfg.phoneVerification.required

    if (ctx.abuseChecker) {
      const verdict = await ctx.abuseChecker.checkReq(req)
      if (!verdict.requirePhone) {
        phoneVerificationRequired = false
      }
    }

    return {
      encoding: 'application/json',
      body: {
        availableUserDomains,
        inviteCodeRequired,
        phoneVerificationRequired,
        links: { privacyPolicy, termsOfService },
      },
    }
  })
}
