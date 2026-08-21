import 'server-only'

import { auth } from '@clerk/nextjs/server'
import type { FunctionReference, FunctionReturnType } from 'convex/server'
import { fetchAction, fetchMutation, fetchQuery, type NextjsOptions } from 'convex/nextjs'

/**
 * RSCs authenticate to Convex with the Clerk `convex` JWT template. Without a
 * token the call still succeeds but arrives unauthenticated, which silently
 * turns every admin query into AUTHORIZATION_FAILED — pass this to anything
 * that needs an identity.
 */
export const convexToken = async (): Promise<string | undefined> => {
  const { getToken } = await auth()
  return (await getToken({ template: 'convex' })) ?? undefined
}

type ArgsAndOptionsTuple<Ref extends FunctionReference<any, any, any, any>, O> =
  Ref extends FunctionReference<any, any, infer A> ? (A extends Record<string, never> ? [args?: A | undefined, options?: O] : [args: A, options?: O]) : never

// Typed as passthrough wrappers via generics rather than `typeof fetchQuery`
// because the partial-application signature is narrower than Convex's overloads.
export const authedQuery = async <Query extends FunctionReference<'query'>>(
  reference: Query,
  ...args: ArgsAndOptionsTuple<Query, NextjsOptions>
): Promise<FunctionReturnType<Query>> => {
  const [args_, options] = args as [{}, NextjsOptions | undefined]
  return fetchQuery(reference, args_ ?? {}, { ...options, token: (await convexToken()) ?? options?.token })
}

export const authedMutation = async <Mutation extends FunctionReference<'mutation'>>(
  reference: Mutation,
  ...args: ArgsAndOptionsTuple<Mutation, NextjsOptions>
): Promise<FunctionReturnType<Mutation>> => {
  const [args_, options] = args as [{}, NextjsOptions | undefined]
  return fetchMutation(reference, args_ ?? {}, { ...options, token: (await convexToken()) ?? options?.token })
}

export const authedAction = async <Action extends FunctionReference<'action'>>(
  reference: Action,
  ...args: ArgsAndOptionsTuple<Action, NextjsOptions>
): Promise<FunctionReturnType<Action>> => {
  const [args_, options] = args as [{}, NextjsOptions | undefined]
  return fetchAction(reference, args_ ?? {}, { ...options, token: (await convexToken()) ?? options?.token })
}

/** Public reads that need no identity. */
export const publicQuery: typeof fetchQuery = fetchQuery
