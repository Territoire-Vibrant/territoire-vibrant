// @vitest-environment edge-runtime
import { convexTest } from 'convex-test'
import { describe, expect, it } from 'vitest'

import { api } from './_generated/api'
import schema from './schema'

const modules = import.meta.glob('./**/*.*s')

const makeTest = () => convexTest(schema, modules)

const adminIdentity = {
  tokenIdentifier: 'https://clerk.territoirevibrant.ca|admin_1',
  subject: 'admin_1',
  issuer: 'https://clerk.territoirevibrant.ca',
  email: 'admin@example.com',
}

const seedAdmin = async (t: ReturnType<typeof makeTest>) => {
  await t.run(async (ctx) => {
    await ctx.db.insert('users', {
      tokenIdentifier: adminIdentity.tokenIdentifier,
      clerkUserId: adminIdentity.subject,
      email: adminIdentity.email,
      isAdmin: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  })
}

describe('products', () => {
  it('stores the price as integer cents', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const productId = await asAdmin.mutation(api.products.create, {
      name: 'Livro',
      price: 89.9,
      type: 'PHYSICAL',
      isActive: true,
    })

    const product = await asAdmin.query(api.products.getById, { productId })
    expect(product?.priceCents).toBe(8990)
    expect(product?.currency).toBe('CAD')
  })

  it('rejects an invalid price with a typed failure', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await expect(
      asAdmin.mutation(api.products.create, { name: 'X', price: -1, type: 'DIGITAL', isActive: true })
    ).rejects.toThrow()
  })

  it('hides inactive products from the public listing', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    await asAdmin.mutation(api.products.create, { name: 'Ativo', price: 10, type: 'DIGITAL', isActive: true })
    await asAdmin.mutation(api.products.create, { name: 'Inativo', price: 10, type: 'DIGITAL', isActive: false })

    const listed = await t.query(api.products.listActive, {})
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('Ativo')
  })

  it('rejects a non-admin listing every product', async () => {
    const t = makeTest()
    await expect(t.query(api.products.listAll, {})).rejects.toThrow()
  })

  it('picks related products of the same type only', async () => {
    const t = makeTest()
    await seedAdmin(t)
    const asAdmin = t.withIdentity(adminIdentity)

    const bookId = await asAdmin.mutation(api.products.create, {
      name: 'Livro A',
      price: 10,
      type: 'PHYSICAL',
      isActive: true,
    })
    await asAdmin.mutation(api.products.create, { name: 'Livro B', price: 12, type: 'PHYSICAL', isActive: true })
    await asAdmin.mutation(api.products.create, { name: 'Ebook', price: 5, type: 'DIGITAL', isActive: true })

    const related = await t.query(api.products.listRelated, { productId: bookId })
    expect(related.map((product) => product.name)).toEqual(['Livro B'])
  })
})
