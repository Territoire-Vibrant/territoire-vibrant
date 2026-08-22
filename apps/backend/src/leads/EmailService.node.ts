'use node'

import { Effect, Layer, Schedule } from 'effect'

import type { ContactSubject } from '@tv/domain/contact'
import type { Locale } from '@tv/domain/locale'
import { ConfigurationFailure, ExternalServiceUnavailable } from '../shared/errors'
import { EmailService, type ContactEmail, type EbookEmail, type EmailPort } from './EmailService'

/**
 * The live MailerSend implementation. Isolated in its own module because the
 * SDK pulls in `node:http`, `node:https` and `node:buffer`; esbuild resolves
 * imports statically when bundling for the Convex V8 isolate, so a single
 * import of this file from an isolate-reachable module fails the entire push.
 *
 * Only a `'use node'` entrypoint may import this.
 *
 * Copy is ported verbatim from the pre-migration
 * `src/server/email/mailersend.ts`; the strings the client sees must not drift.
 */

const APP_NAME = 'Território Vibrante'
const SITE_URL = 'https://territoirevibrant.ca'

/**
 * The ebook PDF used to be read off the Next.js filesystem with
 * `readFile(process.cwd() + '/public/downloads/ebook.pdf')`. Convex runs on a
 * different host with no access to that directory, so it is fetched over HTTP
 * from the public site instead — the same file, same bytes, reachable from
 * anywhere.
 */
const EBOOK_URL = `${SITE_URL}/downloads/ebook.pdf`

const CONTACT_SUBJECT_LABELS: Record<ContactSubject, string> = {
  partnership: 'Propor parceria',
  quote: 'Solicitação de orçamento',
  invitation: 'Convite',
  other: 'Outros',
}

const EBOOK_EMAIL_CONTENT: Record<
  Locale,
  {
    subject: string
    greeting: (name: string) => string
    intro: string
    outro: string
    footer: string
  }
> = {
  en: {
    subject: 'Your e-book: Vibrant Territory',
    greeting: (name) => `Hello, ${name}!`,
    intro:
      'Thank you for your interest in our e-book. Your free guide, "Vibrant Territory", is attached to this email.',
    outro: 'We hope it inspires your next project.',
    footer: 'Território Vibrante',
  },
  es: {
    subject: 'Tu e-book: Territorio Vibrante',
    greeting: (name) => `¡Hola, ${name}!`,
    intro:
      'Gracias por tu interés en nuestro e-book. Tu guía gratuita, "Territorio Vibrante", está adjunta a este correo.',
    outro: 'Esperamos que inspire tu próximo proyecto.',
    footer: 'Território Vibrante',
  },
  fr: {
    subject: 'Votre e-book : Territoire Vibrant',
    greeting: (name) => `Bonjour, ${name} !`,
    intro: `Merci pour votre intérêt pour notre e-book. Votre guide gratuit, "Territoire Vibrant", est joint à cet email.`,
    outro: "Nous espérons qu'il inspirera votre prochain projet.",
    footer: 'Território Vibrante',
  },
  pt: {
    subject: 'Seu e-book: Território Vibrante',
    greeting: (name) => `Olá, ${name}!`,
    intro:
      'Obrigado pelo interesse no nosso e-book. O seu guia gratuito "Território Vibrante" está anexado neste email.',
    outro: 'Esperamos que ele inspire o seu próximo projeto.',
    footer: 'Território Vibrante',
  },
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

/** Transient transport failures only — a rejected payload is never retried. */
const retryPolicy = Schedule.exponential('200 millis').pipe(Schedule.upTo({ duration: '5 seconds', times: 3 }))

export const EmailServiceNodeLive = Layer.effect(
  EmailService,
  Effect.gen(function* () {
    const apiKey = process.env.MAILERSEND_API_KEY
    if (!apiKey) {
      return yield* Effect.fail(new ConfigurationFailure({ messageKey: 'errors.email.missingApiKey' }))
    }

    const fromEmail = process.env.MAILERSEND_FROM_EMAIL ?? 'macneves@territoirevibrant.ca'
    const contactEmail = process.env.CONTACT_EMAIL ?? 'macneves@territoirevibrant.ca'

    const { Attachment, EmailParams, MailerSend, Recipient, Sender } = yield* Effect.promise(
      () => import('mailersend')
    )

    const mailer = new MailerSend({ apiKey })

    /**
     * MailerSend returns the message id in the `x-message-id` header; the old
     * implementation treated a missing id as a failure and callers depend on
     * getting one back, so that behavior is preserved.
     */
    const send = (params: InstanceType<typeof EmailParams>, operation: string) =>
      Effect.tryPromise({
        try: async () => {
          const response = await mailer.email.send(params)
          const emailId = response.headers?.['x-message-id']
          if (!emailId || typeof emailId !== 'string') {
            throw new Error('MailerSend did not return a message id.')
          }
          return emailId
        },
        catch: () =>
          new ExternalServiceUnavailable({
            messageKey: 'errors.email.sendFailed',
            service: 'mailersend',
            retryable: true,
            details: { operation },
          }),
      }).pipe(Effect.retry(retryPolicy))

    const fetchEbook = Effect.tryPromise({
      try: async () => {
        const response = await fetch(EBOOK_URL)
        if (!response.ok) {
          throw new Error(`ebook fetch failed with ${response.status}`)
        }
        return Buffer.from(await response.arrayBuffer()).toString('base64')
      },
      catch: () =>
        new ExternalServiceUnavailable({
          messageKey: 'errors.email.ebookUnavailable',
          service: 'ebook-cdn',
          retryable: true,
          details: { url: EBOOK_URL },
        }),
    }).pipe(Effect.retry(retryPolicy))

    const port: EmailPort = {
      sendEbook: (input: EbookEmail) =>
        Effect.gen(function* () {
          const content = EBOOK_EMAIL_CONTENT[input.locale]
          const ebookBase64 = yield* fetchEbook

          const params = new EmailParams()
            .setFrom(new Sender(fromEmail, APP_NAME))
            .setTo([new Recipient(input.email, input.name)])
            .setSubject(content.subject)
            .setHtml(
              `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #579514;">${escapeHtml(content.greeting(input.name))}</h2>
        <p style="color: #333; line-height: 1.6;">
          ${escapeHtml(content.intro)}
        </p>
        <p style="color: #333; line-height: 1.6;">
          ${escapeHtml(content.outro)}
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="color: #888; font-size: 12px;">
          ${escapeHtml(content.footer)} -
          <a href="${SITE_URL}" style="color: #579514;">${SITE_URL.replace('https://', '')}</a>
        </p>
      </div>
    `
            )
            .setText(
              [
                content.greeting(input.name),
                '',
                content.intro,
                '',
                content.outro,
                '',
                `${content.footer} - ${SITE_URL}`,
              ].join('\n')
            )
            .setAttachments([new Attachment(ebookBase64, 'ebook.pdf', 'attachment')])

          return yield* send(params, 'sendEbook')
        }),

      sendContact: (input: ContactEmail) => {
        const name = escapeHtml(input.name)
        const email = escapeHtml(input.email)
        const message = escapeHtml(input.message)
        const subjectLabel = CONTACT_SUBJECT_LABELS[input.subject]

        const params = new EmailParams()
          .setFrom(new Sender(fromEmail, APP_NAME))
          .setTo([new Recipient(contactEmail, contactEmail)])
          .setReplyTo(new Recipient(input.email, input.name))
          .setSubject(`[${subjectLabel}] Nova mensagem de ${input.name}`)
          .setHtml(
            `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #579514;">Nova mensagem de contato</h2>
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0 0 10px;"><strong>Nome:</strong> ${name}</p>
          <p style="margin: 0 0 10px;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 0 0 10px;"><strong>Assunto:</strong> ${subjectLabel}</p>
        </div>
        <div style="background: #fff; border: 1px solid #e0e0e0; padding: 20px; border-radius: 8px;">
          <h3 style="margin-top: 0; color: #333;">Mensagem:</h3>
          <p style="white-space: pre-wrap; color: #555;">${message}</p>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="color: #888; font-size: 12px;">
          Esta mensagem foi enviada através do formulário de contato do site Território Vibrante.
        </p>
      </div>
    `
          )
          .setText(
            [
              'Nova mensagem de contato',
              '',
              `Nome: ${input.name}`,
              `Email: ${input.email}`,
              `Assunto: ${subjectLabel}`,
              '',
              'Mensagem:',
              input.message,
            ].join('\n')
          )

        return send(params, 'sendContact')
      },
    }

    return EmailService.of(port)
  })
)
