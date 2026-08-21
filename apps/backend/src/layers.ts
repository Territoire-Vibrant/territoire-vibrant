import { Layer } from 'effect'

import { type EmailService, EmailServiceIsolateLive } from './leads/EmailService'

export type BackendServices = EmailService

/**
 * Services available in the Convex V8 isolate: queries, mutations, and any
 * action without the `'use node'` directive.
 *
 * This module must never import a Node-only implementation. esbuild resolves
 * imports statically when bundling for the isolate, so pulling
 * `EmailService.node.ts` in here would drag `node:http` into every function and
 * fail the push. The Node layers are composed in `layers.node.ts` instead.
 */
export const BackendLive = Layer.mergeAll(EmailServiceIsolateLive)
