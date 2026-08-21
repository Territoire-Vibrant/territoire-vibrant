import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

// Determine whether a user has admin privileges based on Clerk session claims.
// Supports:
// - claims.metadata.role === 'admin'
// - claims.org_role === 'admin'
// - organization claim map values like 'org:admin' or any value ending with ':admin'
// - organizations may be an object map or array of strings.
/**
 * Checks if a user has admin privileges based on their session claims.
 *
 * This function examines various locations in the session claims object to determine
 * if the user has admin role, including:
 * - Direct metadata role
 * - Organization role
 * - Organization-specific roles in the organizations claim
 *
 * @param sessionClaims - The session claims object to check for admin privileges
 * @returns `true` if the user has admin privileges, `false` otherwise
 *
 * @remarks
 * The function checks for admin privileges in the following order:
 * 1. `claims.metadata.role === 'admin'`
 * 2. `claims.org_role === 'admin'`
 * 3. Any organization role that equals 'org:admin' or ends with ':admin'
 *
 * @example
 * ```typescript
 * const claims = { metadata: { role: 'admin' } };
 * isAdminFromSessionClaims(claims); // returns true
 * ```
 */
export const isAdminFromSessionClaims = (sessionClaims: unknown): boolean => {
  if (!sessionClaims || typeof sessionClaims !== 'object') return false
  const claims: any = sessionClaims

  if (claims?.metadata?.role === 'admin') return true
  if (claims?.org_role === 'admin') return true

  const orgClaims = claims.organizations
  let orgRoles: string[] = []
  if (Array.isArray(orgClaims)) {
    orgRoles = orgClaims.filter((v) => typeof v === 'string') as string[]
  } else if (orgClaims && typeof orgClaims === 'object') {
    orgRoles = Object.values(orgClaims).filter((v) => typeof v === 'string') as string[]
  }

  return orgRoles.some((r) => r === 'org:admin' || r.endsWith(':admin'))
}
