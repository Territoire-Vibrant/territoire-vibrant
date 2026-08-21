import type { Locale } from '@tv/domain/locale'
import { LocaleValidator } from '@tv/domain/validators'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import { action, internalMutation, mutation, query } from './_generated/server'
import { runEffect } from './lib/effectRuntime'
import { requireAdmin } from './helpers/auth'
import { EmailService, type EbookEmail } from '../src/leads/EmailService'
import { ExternalServiceUnavailable } from '../src/shared/errors'

/**
 * Mirrors the old tRPC contract: the lead is persisted first, then the ebook
 * email is attempted. Delivery is scheduled rather than awaited, so a
 * MailerSend outage can never lose a captured lead — the write commits and
 * the action retries independently.
 */
export const capture = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    locale: LocaleValidator,
  },
  handler: async (ctx, args) => {
    const leadId = await ctx.db.insert('leads', {
      name: args.name,
      email: args.email,
      phone: args.phone,
      locale: args.locale,
      createdAt: Date.now(),
    })

    await ctx.scheduler.runAfter(0, internal.contact.sendEbook, {
      leadId,
      email: args.email,
      name: args.name,
      locale: args.locale,
    })

    return { leadId, success: true as const }
  },
})

export const markDelivery = internalMutation({
  args: {
    leadId: v.id('leads'),
    status: v.union(v.literal('sent'), v.literal('email_failed')),
  },
  handler: (ctx, args) => ctx.db.patch(args.leadId, { deliveryStatus: args.status }),
})

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx)
    return ctx.db.query('leads').withIndex('by_createdAt').order('desc').collect()
  },
})
