import { anyApi, type FunctionReference, type FunctionReturnType, type OptionalRestArgs } from 'convex/server'

import type { api as generatedApi } from '@tv/backend/api'

type AnyBackendFunction = FunctionReference<any, any, any, any>

/**
 * Client-safe access to the Convex API. The type comes from the backend's
 * generated API, so a renamed function fails to compile in every client
 * instead of failing at runtime. `import type` is erased at build time and
 * `anyApi` resolves references by name, so no bundler ever walks into a server
 * module to satisfy this import.
 */
export const api = anyApi as unknown as typeof generatedApi

export type BackendApi = typeof generatedApi
export type BackendResult<T extends AnyBackendFunction> = FunctionReturnType<T>
export type BackendArgs<T extends AnyBackendFunction> = OptionalRestArgs<T>[0]

type ArrayElement<T> = T extends readonly (infer E)[] ? E : never

export type BackendArticle = NonNullable<BackendResult<BackendApi['articles']['getByAnyId']>>
export type BackendArticleTranslation = ArrayElement<BackendArticle['translations']>
export type BackendProduct = NonNullable<BackendResult<BackendApi['products']['getByAnyId']>>
export type BackendUser = NonNullable<BackendResult<BackendApi['users']['getCurrent']>>
