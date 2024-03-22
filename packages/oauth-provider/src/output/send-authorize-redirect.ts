import { IncomingMessage, ServerResponse } from 'node:http'

import { html, javascriptCode } from '@atproto/html'

import { Client } from '../client/client.js'
import { AuthorizationParameters } from '../parameters/authorization-parameters.js'
import { Code } from '../request/code.js'
import { TokenType } from '../token/token-type.js'
import { sendWebPage } from './send-web-page.js'

export type AuthorizationResponseParameters = {
  // Will be added from AuthorizationResultRedirect['issuer']
  // iss: string // rfc9207

  // Will be added from AuthorizationResultRedirect['parameters']
  // state?: string

  code?: Code
  id_token?: string
  access_token?: string
  token_type?: TokenType
  expires_in?: string

  response?: string // FAPI JARM
  session_state?: string // OIDC Session Management

  error?: string
  error_description?: string
  error_uri?: string
}

export type AuthorizationResultRedirect = {
  issuer: string
  client: Client
  parameters: AuthorizationParameters
  redirect: AuthorizationResponseParameters
}

export async function sendAuthorizeRedirect(
  req: IncomingMessage,
  res: ServerResponse,
  result: AuthorizationResultRedirect,
): Promise<void> {
  const { issuer, parameters, redirect, client } = result

  const uri = parameters.redirect_uri || client.metadata.redirect_uris[0]
  const mode = parameters.response_mode || 'query' // TODO: default depends on response_type

  const entries: [string, string][] = Object.entries({
    iss: issuer, // rfc9207
    state: parameters.state,

    response: redirect.response, // FAPI JARM
    session_state: redirect.session_state, // OIDC Session Management

    code: redirect.code,
    id_token: redirect.id_token,
    access_token: redirect.access_token,
    expires_in: redirect.expires_in,
    token_type: redirect.token_type,

    error: redirect.error,
    error_description: redirect.error_description,
    error_uri: redirect.error_uri,
  }).filter((entry): entry is [string, string] => entry[1] != null)

  res.setHeader('Cache-Control', 'no-store')

  switch (mode) {
    case 'query':
      return writeQuery(res, uri, entries)
    case 'fragment':
      return writeFragment(res, uri, entries)
    case 'form_post':
      return writeFormPost(res, uri, entries)
  }

  // @ts-expect-error fool proof
  throw new Error(`Unsupported mode: ${mode}`)
}

function writeQuery(
  res: ServerResponse,
  uri: string,
  entries: readonly [string, string][],
) {
  const url = new URL(uri)
  for (const [key, value] of entries) url.searchParams.set(key, value)
  res.writeHead(302, { Location: url.href }).end()
}

function writeFragment(
  res: ServerResponse,
  uri: string,
  entries: readonly [string, string][],
) {
  const url = new URL(uri)
  const searchParams = new URLSearchParams()
  for (const [key, value] of entries) searchParams.set(key, value)
  url.hash = searchParams.toString()
  res.writeHead(302, { Location: url.href }).end()
}

async function writeFormPost(
  res: ServerResponse,
  uri: string,
  entries: readonly [string, string][],
) {
  // Prevent the Chrome from caching this page
  // see: https://latesthackingnews.com/2023/12/12/google-updates-chrome-bfcache-for-faster-page-viewing/
  res.setHeader('Set-Cookie', `bfCacheBypass=foo; max-age=1; SameSite=Lax`)

  return sendWebPage(res, {
    body: html`
      <form method="post" action="${uri}">
        ${entries.map(([key, value]) => [
          html`<input type="hidden" name="${key}" value="${value}" />`,
        ])}
        <input type="submit" value="Continue" />
      </form>
    `,
    scripts: [javascriptCode('document.forms[0].submit();')],
  })
}