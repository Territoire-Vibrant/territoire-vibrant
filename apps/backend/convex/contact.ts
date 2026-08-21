'use node'

import { Effect, Exit } from 'effect'
import { v } from 'convex/values'

import type { Locale } from '@tv/domain/locale'
import { LocaleValidator } from '@tv/domain/validators'
import { ContactFormSchema } from '@tv/domain/contact'
import { internal } from './_generated/api'
import { action, internalAction } from './_generated/server'
import { runNodeEffect } from './lib/effectRuntimeNode'
import { EmailService, type ContactEmail, type EbookEmail } from '../src/leads/EmailService'

/**
 * Node-only actions. The live MailerSend port is reachable exclusively through
 * `runNodeEffect` — the isolate runtime would fail loudly instead.
 */

export const sendEbook = internalAction({
  args: {
    leadId: v.id('leads'),
    email: v.string(),
    name: v.string(),
    locale: LocaleValidator,
  },
  handler: async (ctx, args) => {
    // Skeleton copy. Port the real per-locale templates from
    // territoire-vibrant-site/src/server/email/mailersend.ts before cutover.
    const input: EbookEmail = { email: args.email, name: args.name, locale: args.locale }

    await runNodeEffect(
      Effect.gen(function* () {
        const email = yield* EmailService

        // Delivery failure must not fail the action: the lead is already
        // committed, so a failed send is recorded, not thrown.
        const exit = yield* Effect.exit(email.sendEbook(input))
        if (Exit.isFailure(exit)) {
          yield* Effect.promise(() =>
            ctx.runMutation(internal.leads.markDelivery, { leadId: args.leadId, status: 'email_failed' })
          )
          return
        }

        yield* Effect.promise(() =>
          ctx.runMutation(internal.leads.markDelivery, { leadId: args.leadId, status: 'sent' })
        )
      })
    )
  },
})

/** Replaces `contact.send`. Pure email, no database write. */
export const send = action({
  args: {
    name: v.string(),
    email: v.string(),
    subject: v.string(),
    message: v.string(),
  },
  handler: async (_ctx, args) => {
    // Validation lives at this boundary because the action is public.
    const parsed = ContactFormSchema.parse(args)

    const input: ContactEmail = {
      email: parsed.email,
      name: parsed.name,
      subject: parsed.subject,
      message: parsed.message,
    }

    await runNodeEffect(
      Effect.gen(function* () {
        const email = yield* EmailService
        yield* email.sendContact(input)
      })
    )

    return { success: true as const }
  },
})
