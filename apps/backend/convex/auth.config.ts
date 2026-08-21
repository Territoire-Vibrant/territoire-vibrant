import type { AuthConfig } from 'convex/server'

/**
 * Clerk is the only auth provider. `domain` must match the `iss` claim of the
 * session token exactly, and `applicationID` must match the JWT template name
 * in the Clerk dashboard (the template is literally called `convex`).
 *
 * The issuer here is the custom domain, verified against
 * https://clerk.territoirevibrant.ca/.well-known/openid-configuration — no
 * trailing slash, because `iss` carries none.
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig
