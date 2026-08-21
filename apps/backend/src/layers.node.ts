'use node'

import { Layer } from 'effect'

import type { EmailService, EmailPort } from './leads/EmailService'
import { EmailServiceNodeLive } from './leads/EmailService.node'

export type BackendServices = EmailService

/**
 * Services for `'use node'` actions. MailerSend's SDK needs Node, so the live
 * email port is only reachable from that runtime.
 *
 * Kept separate from `layers.ts` on purpose: importing this from an
 * isolate-reachable module drags `node:http` into the V8 bundle and fails the
 * whole `convex dev` push.
 */
export const BackendNodeLive = Layer.mergeAll(EmailServiceNodeLive)
