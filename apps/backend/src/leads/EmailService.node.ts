'use node'

import { Effect, Layer, Schedule } from 'effect'

import { EmailService, type EmailPort } from './EmailService'
import { ConfigurationFailure, ExternalServiceUnavailable } from '../shared/errors'

/**
 * The live MailerSend implementation. Isolated in its own module because the
 * SDK pulls in `node:http`, `node:https` and `node:buffer`; esbuild resolves
 * imports statically when bundling for the Convex V8 isolate, so a single
 * import of this file from an isolate-reachable module fails the entire push.
 *
 * Only a `'use node'` entrypoint may import this.
 */

/** Transient transport failures only — a rejected payload is never retried. */
const retryPolicy = Schedule.exponential('200 millis').pipe(Schedule.upTo({ duration: '5 seconds', times: 3 }))

export const EmailServiceNodeLive = Layer.effect(
  EmailService,
  Effect.gen(function* () {
    const apiKey = process.env.MAILERSEND_API_KEY
    if (!apiKey) {
      return yield* Effect.fail(new ConfigurationFailure({ messageKey: 'errors.email.missingApiKey' }))
    }

    const { EmailParams, MailerSend, Recipient, Sender } = yield* Effect.promise(() => import('mailersend'))

    const mailer = new MailerSend({ apiKey })
    const from = new Sender(process.env.MAILERSEND_FROM_EMAIL ?? 'macneves@territoirevibrant.ca', 'Territoire Vibrant')

    const send = (params: InstanceType<typeof EmailParams>, operation: string) =>
      Effect.tryPromise({
        try: () => mailer.email.send(params),
        catch: () =>
          new ExternalServiceUnavailable({
            messageKey: 'errors.email.sendFailed',
            service: 'mailersend',
            retryable: true,
            details: { operation },
          }),
      }).pipe(Effect.retry(retryPolicy), Effect.asVoid)

    return EmailService.of({
      sendEbook: (input) =>
        send(
          new EmailParams()
            .setFrom(from)
            .setTo([new Recipient(input.email, input.name)])
            .setSubject('Territoire Vibrant')
            .setHtml(`<p>Bonjour ${input.name}</p>`),
          'sendEbook'
        ),

      sendContact: (input) =>
        send(
          new EmailParams()
            .setFrom(from)
            .setTo([new Recipient(process.env.CONTACT_EMAIL ?? 'macneves@territoirevibrant.ca')])
            .setReplyTo(new Recipient(input.email, input.name))
            .setSubject(`[${input.subject}] ${input.name}`)
            .setText(input.message),
          'sendContact'
        ),
    } satisfies EmailPort)
  })
)
