import { Context, Effect, Layer } from 'effect'

import type { ContactSubject } from '@tv/domain/contact'
import type { Locale } from '@tv/domain/locale'
import { ConfigurationFailure, type ExternalServiceUnavailable } from '../shared/errors'

export type EbookEmail = { email: string; name: string; locale: Locale }
export type ContactEmail = { email: string; name: string; subject: ContactSubject; message: string }

export type EmailPort = {
  readonly sendEbook: (input: EbookEmail) => Effect.Effect<string, ExternalServiceUnavailable | ConfigurationFailure>
  readonly sendContact: (input: ContactEmail) => Effect.Effect<string, ExternalServiceUnavailable | ConfigurationFailure>
}

/**
 * The email capability, not the vendor. The domain asks for "send the ebook";
 * which SDK does it is a Layer decision, which is what makes the lead workflow
 * testable without a network. Both operations return MailerSend's message id,
 * matching the contract the old tRPC `contact.send` exposed.
 *
 * This module must stay free of any Node-only import. It is reachable from the
 * Convex V8 isolate, and esbuild resolves imports statically when bundling for
 * that runtime — an `import('mailersend')` anywhere in this file's import graph
 * fails the whole push with "Could not resolve node:http". The live MailerSend
 * implementation therefore lives in `EmailService.node.ts`, which only a
 * `'use node'` entrypoint may reach.
 */
export class EmailService extends Context.Service<EmailService, EmailPort>()('EmailService') {}

/**
 * The isolate cannot send mail, so it fails loudly instead of silently
 * dropping the message. Anything that actually sends runs in a `'use node'`
 * action against the layer in `EmailService.node.ts`.
 */
export const EmailServiceIsolateLive = Layer.succeed(EmailService, {
  sendEbook: () => Effect.fail(new ConfigurationFailure({ messageKey: 'errors.email.unavailableInIsolate' })),
  sendContact: () => Effect.fail(new ConfigurationFailure({ messageKey: 'errors.email.unavailableInIsolate' })),
})
