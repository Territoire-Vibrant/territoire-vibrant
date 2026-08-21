// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

/**
 * In a Bun monorepo node_modules is hoisted to the workspace root and
 * convex-test's default `import.meta.glob('../../../convex/**')` no longer
 * lands on this directory — pass the module map explicitly.
 */
const modules = import.meta.glob('./**/*.*s')

const makeTest = () => convexTest(schema, modules)

const identity = {
  tokenIdentifier: 'https://clerk.territoirevibrant.ca|user_test1',
  subject: 'user_test1',
  issuer: 'https://clerk.territoirevibrant.ca',
  email: 'someone@example.com',
  name: 'Someone',
}

describe('users.store', () => {
  it('creates the user row on first call', async () => {
    const t = makeTest()
    const asUser = t.withIdentity(identity)

    await asUser.mutation(api.users.store, {})
    const user = await asUser.query(api.users.getCurrent, {})

    expect(user?.clerkUserId).toBe('user_test1')
    expect(user?.email).toBe('someone@example.com')
    expect(user?.isAdmin).toBeFalsy()
  })

  it('is idempotent across repeated calls', async () => {
    const t = makeTest()
    const asUser = t.withIdentity(identity)

    await asUser.mutation(api.users.store, {})
    await asUser.mutation(api.users.store, {})

    const rows = await t.run(async (ctx) => ctx.db.query('users').collect())
    expect(rows).toHaveLength(1)
  })

  it('refreshes profile fields when the identity changes', async () => {
    const t = makeTest()
    const asUser = t.withIdentity(identity)

    await asUser.mutation(api.users.store, {})
    await asUser.mutation(api.users.store, {})

    const rows = await t.run(async (ctx) => ctx.db.query('users').collect())
    expect(rows[0]?.email).toBe('someone@example.com')
  })

  it('rejects an unauthenticated caller', async () => {
    const t = makeTest()
    await expect(t.mutation(api.users.store, {})).rejects.toThrow()
  })
})
