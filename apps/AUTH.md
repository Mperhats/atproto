Looking at the codebase, the JWT validation happens in the authorization middleware. Here's the specific code that validates JWTs on incoming requests:

I need to:
- run a local PDS and disable the build step for a faster dev loop.
- run the PDS directly in the monorepo with `workspace:^` dep in the statusphere app instead of resolving the users DID from the
- the PDS requires a DID in order to find the host url for the authenticated users PDS.
    - need to understand DID resolution - where is the DID doc with the users PDS uri retrieved? How can I point this to local host?
    - we need a solution to the users DID doc hosting their PDS URL.

## DID Resolution in the OAuth Flow

DID resolution is a critical part of the authentication flow that connects user identities to their PDS endpoints. Here's how it works:

### DID Resolution Process

1. **Handle Resolution**: A user's handle (e.g., `username.bsky.social`) is first resolved to a DID
   ```typescript
   // In IdResolver class
   const did = await idResolver.handle.resolve(handle)
   ```

2. **DID Document Retrieval**: The DID is then resolved to a DID document containing:
   - Public keys for verification
   - Service endpoints including the PDS URL
   - Other identity metadata
   ```typescript
   const didDoc = await idResolver.did.resolve(did)
   ```

3. **PDS Endpoint Extraction**: The PDS endpoint is extracted from the DID document
   ```typescript
   // Agent uses this to know which server to contact
   const pdsEndpoint = getPdsEndpoint(didDoc)
   ```

### Key Files in DID Resolution
- `packages/identity/src/id-resolver.ts` - Main resolver implementation
- `packages/identity/src/did/did-resolver.ts` - DID document resolution logic
- `packages/identity/src/handle/index.ts` - Handle resolution
- `packages/pds/src/auth-verifier.ts` - JWT verification using DID documents
- `packages/api/src/agent.ts` - Uses DID docs to find PDS endpoints

### Integration in OAuth Flow

1. **During OAuth Initiation**:
   ```typescript
   // When a user logs in, their handle is resolved to a DID
   const did = await idResolver.handle.resolve(handle)
   // Then the DID document is retrieved to find auth service
   const didDoc = await idResolver.did.resolve(did)
   ```

2. **During JWT Verification**:
   ```typescript
   // The PDS verifies JWT tokens using keys from DID documents
   const didDoc = await this.idResolver.did.resolve(did, forceRefresh)
   const signingKey = getVerificationMaterial(didDoc, keyId)
   ```

3. **For API Requests**:
   ```typescript
   // The agent uses the DID document to determine which PDS to contact
   this._updateApiEndpoint(res.body.didDoc)
   ```

### Local Development Solution

For local development, you can create a mock IdResolver that bypasses network resolution:

```typescript
class LocalDevResolver extends IdResolver {
  async resolve(did: string) {
    // Return a mock DID document that points to localhost
    return {
      id: did,
      service: [{
        id: '#atproto_pds',
        type: 'AtprotoPersonalDataServer',
        serviceEndpoint: 'http://localhost:3000' // Your local PDS
      }],
      verificationMethod: [/* Add mock verification keys */]
    }
  }
}

// In your app context creation
const resolver = env.isDevelopment
  ? new LocalDevResolver()
  : createIdResolver()
```

This allows you to:
1. Bypass the need for real DID resolution during development
2. Point all requests to your local PDS regardless of user
3. Simplify local testing without network dependencies

When using this approach, all JWT validation and PDS operations will work against your local server, eliminating the need for real network connections during development.

This completes the chain:
1. JWT contains claims about a user's DID
2. PDS verifies JWT signature using cryptographic keys from DID document
3. JWT's DID claim must match the repository being accessed
4. If verified, the PDS performs the requested operation on behalf of the user


This is how the PDS establishes the direct relationship between the JWT bearer token (from OAuth) and a user's DID, authorizing operations on their repository.

# OAuth Flow & Record Creation Lifecycle

## 1. Initial OAuth Flow (Frontend)
```typescript:apps/statusphere-react/packages/client/src/services/api.ts
// User initiates login
async login(handle: string) {
  const response = await fetch('/oauth/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ handle }),
  })
  // Returns redirect URL for OAuth
}
```

## 2. OAuth Handler (Backend)
```typescript:apps/statusphere-react/packages/appview/src/api/oauth.ts
export const createRouter = (ctx: AppContext) => {
  // Initiates OAuth flow
  router.post('/oauth/initiate', async (req, res) => {
    const url = await ctx.oauthClient.authorize(handle, {
      scope: 'atproto transition:generic'  // Defines permissions
    })
    res.json({ redirectUrl: url.toString() })
  })

  // Handles OAuth callback
  router.get('/oauth/callback', async (req, res) => {
    const { session } = await ctx.oauthClient.callback(params)
    // Stores DID in session
    clientSession.did = session.did
    await clientSession.save()
  })
}
```

## 3. Record Creation Flow
When a user tries to create a status:

```typescript:apps/statusphere-react/packages/appview/src/api/lexicons/sendStatus.ts
export default function (server: Server, ctx: AppContext) {
  server.xyz.statusphere.sendStatus({
    handler: async ({ input, req, res }) => {
      // 1. Get authenticated agent
      const agent = await getSessionAgent(req, res, ctx)
      if (!agent) {
        throw new AuthRequiredError('Authentication required')
      }

      // 2. Create record
      const response = await agent.com.atproto.repo.putRecord({
        repo: agent.assertDid,
        collection: 'xyz.statusphere.status',
        rkey,
        record: validation.value,
        validate: false,
      })
    }
  })
}
```

## 4. PDS Record Validation
```typescript:packages/pds/src/api/com/atproto/repo/putRecord.ts
server.com.atproto.repo.putRecord({
  handler: async ({ auth, input }) => {
    const { repo, collection, rkey, record } = input.body

    // Verify user has permission to write to this repo
    if (did !== auth.credentials.did) {
      throw new AuthRequiredError()
    }

    // Validate and write record
    const uri = AtUri.make(did, collection, rkey)
  }
})
```

## 5. JWT Verification
```typescript:packages/pds/src/auth-verifier.ts
export class AuthVerifier {
  async verifyServiceJwt(reqCtx: ReqCtx, opts: { aud: string | null; iss: string[] | null }) {
    const getSigningKey = async (iss: string, forceRefresh: boolean) => {
      // Resolves DID document to get signing key
      const didDoc = await this.idResolver.did.resolve(did, forceRefresh)
    }

    // Verify JWT token
    const jwtStr = bearerTokenFromReq(reqCtx.req)
    if (!jwtStr) {
      throw new AuthRequiredError('missing jwt', 'MissingJwt')
    }
  }
}
```

## Key Files in the Authentication Chain:

IMPORTANT! TO RUN A PDS LOCALLY SEE `packages/dev-env/README.md`

1. **OAuth Configuration**:
   - `packages/appview/src/auth/client.ts` - OAuth client setup
   - `packages/appview/src/api/oauth.ts` - OAuth routes and handlers

2. **Session Management**:
   - `packages/appview/src/session.ts` - Session handling
   - `packages/api/src/agent.ts` - ATP Agent session management

3. **Record Operations**:
   - `packages/appview/src/api/lexicons/sendStatus.ts` - Status creation endpoint
   - `packages/pds/src/api/com/atproto/repo/putRecord.ts` - Record writing in PDS

4. **Authentication Verification**:
   - `packages/pds/src/auth-verifier.ts` - JWT verification
   - `packages/pds/src/api/com/atproto/server/createSession.ts` - Session creation

## Scopes and Permissions

The OAuth scope `atproto transition:generic` grants permissions for:
1. Reading user profile
2. Writing records to the user's repository
3. Managing user data

The PDS enforces these permissions by:
1. Validating JWT tokens on each request
2. Checking that the authenticated DID matches the repository being modified
3. Ensuring operations conform to the granted scopes

This entire flow ensures that:
1. Users authenticate securely via OAuth
2. Sessions are maintained with JWT tokens
3. Operations are authorized against the user's DID
4. Records are properly signed and stored in the user's repository
