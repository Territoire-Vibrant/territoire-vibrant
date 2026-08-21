import { ConvexError } from 'convex/values'
import { Cause, type Effect } from 'effect'

import { BackendLive, type BackendServices } from '../../src/layers'
import { makeAppRuntime } from '../../src/runtime'
import { type AppError, type AppErrorData, internalAppErrorData, toAppErrorData } from '../../src/shared/errors'

const isolateRuntime = makeAppRuntime(BackendLive)

/**
 * The single place a domain program becomes a Convex response. Expected
 * failures cross the wire as structured `ConvexError` data the clients can
 * match on; defects are logged and collapsed so an internal message never
 * reaches a user.
 *
 * Convex exposes no isolate shutdown hook, so this runtime is never disposed —
 * do not register resources that need explicit teardown.
 *
 * The Node counterpart lives in `effectRuntimeNode.ts`. Keep it there: this
 * module is reachable from every query and mutation, and esbuild resolves
 * imports statically when bundling for the V8 isolate, so importing a
 * Node-only layer here fails the whole push with "Could not resolve node:http".
 */
export const runEffect = async <A>(program: Effect.Effect<A, AppError, BackendServices>): Promise<A> => {
  const exit = await isolateRuntime.runPromiseExit(program)

  if (exit._tag === 'Success') return exit.value

  const failure = exit.cause.reasons.find(Cause.isFailReason)
  if (failure) {
    throw new ConvexError<AppErrorData>(toAppErrorData(failure.error))
  }

  console.error('Unexpected Effect defect', Cause.pretty(exit.cause))
  throw new ConvexError<AppErrorData>(internalAppErrorData())
}
