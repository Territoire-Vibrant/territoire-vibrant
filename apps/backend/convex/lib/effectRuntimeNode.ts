'use node'

import { ConvexError } from 'convex/values'
import { Cause, type Effect } from 'effect'

import { BackendNodeLive, type BackendServices } from '../../src/layers.node'
import { makeAppRuntime } from '../../src/runtime'
import { type AppError, type AppErrorData, internalAppErrorData, toAppErrorData } from '../../src/shared/errors'

const nodeRuntime = makeAppRuntime(BackendNodeLive)

/**
 * The Node counterpart of `runEffect`, for actions declared `'use node'`.
 * MailerSend and anything else needing Node APIs runs through this.
 *
 * Never import this from a query, mutation, or plain action — it drags the
 * Node layers into the V8 isolate bundle and fails the push.
 */
export const runNodeEffect = async <A>(program: Effect.Effect<A, AppError, BackendServices>): Promise<A> => {
  const exit = await nodeRuntime.runPromiseExit(program)

  if (exit._tag === 'Success') return exit.value

  const failure = exit.cause.reasons.find(Cause.isFailReason)
  if (failure) {
    throw new ConvexError<AppErrorData>(toAppErrorData(failure.error))
  }

  console.error('Unexpected Effect defect', Cause.pretty(exit.cause))
  throw new ConvexError<AppErrorData>(internalAppErrorData())
}
