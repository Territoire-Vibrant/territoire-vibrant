import { Schema } from 'effect'

/**
 * The wire contract every client sees. Convex serializes `ConvexError.data`,
 * so this is the shape the web and Expo apps pattern-match on. `messageKey` is
 * an i18n key, never user-facing text — the copy and the locale belong to the
 * client, not the backend.
 */
export const APP_ERROR_CODES = [
  'AUTHENTICATION_REQUIRED',
  'AUTHORIZATION_FAILED',
  'RESOURCE_NOT_FOUND',
  'VALIDATION_FAILED',
  'CONFLICT',
  'EXTERNAL_SERVICE_UNAVAILABLE',
  'CONFIGURATION_ERROR',
  'INTERNAL_ERROR',
] as const

export type AppErrorCode = (typeof APP_ERROR_CODES)[number]
export type AppErrorDetail = string | number | boolean

export type AppErrorData = {
  code: AppErrorCode
  messageKey: string
  details?: Record<string, AppErrorDetail>
}

const ErrorFields = {
  messageKey: Schema.String,
  details: Schema.optional(Schema.Unknown),
}

export class AuthenticationRequired extends Schema.TaggedError<AuthenticationRequired>()(
  'AuthenticationRequired',
  ErrorFields
) {}

export class AuthorizationFailure extends Schema.TaggedError<AuthorizationFailure>()(
  'AuthorizationFailure',
  ErrorFields
) {}

export class ResourceNotFound extends Schema.TaggedError<ResourceNotFound>()('ResourceNotFound', ErrorFields) {}

export class ValidationFailure extends Schema.TaggedError<ValidationFailure>()('ValidationFailure', ErrorFields) {}

export class ConflictFailure extends Schema.TaggedError<ConflictFailure>()('ConflictFailure', ErrorFields) {}

export class ExternalServiceUnavailable extends Schema.TaggedError<ExternalServiceUnavailable>()(
  'ExternalServiceUnavailable',
  { ...ErrorFields, service: Schema.String, retryable: Schema.Boolean }
) {}

export class ConfigurationFailure extends Schema.TaggedError<ConfigurationFailure>()(
  'ConfigurationFailure',
  ErrorFields
) {}

export type AppError =
  | AuthenticationRequired
  | AuthorizationFailure
  | ResourceNotFound
  | ValidationFailure
  | ConflictFailure
  | ExternalServiceUnavailable
  | ConfigurationFailure

const errorCodeByTag: Record<AppError['_tag'], AppErrorCode> = {
  AuthenticationRequired: 'AUTHENTICATION_REQUIRED',
  AuthorizationFailure: 'AUTHORIZATION_FAILED',
  ResourceNotFound: 'RESOURCE_NOT_FOUND',
  ValidationFailure: 'VALIDATION_FAILED',
  ConflictFailure: 'CONFLICT',
  ExternalServiceUnavailable: 'EXTERNAL_SERVICE_UNAVAILABLE',
  ConfigurationFailure: 'CONFIGURATION_ERROR',
}

const isDetail = (value: unknown): value is AppErrorDetail =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'

/** Drops anything that is not a primitive so an error can never leak an object. */
const sanitizeDetails = (details: unknown): Record<string, AppErrorDetail> | undefined => {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return undefined
  const entries = Object.entries(details).filter((entry): entry is [string, AppErrorDetail] => isDetail(entry[1]))
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

export const toAppErrorData = (error: AppError): AppErrorData => {
  const details = sanitizeDetails(error.details)
  return {
    code: errorCodeByTag[error._tag],
    messageKey: error.messageKey,
    ...(details ? { details } : {}),
  }
}

/** Defects never reach the client as themselves — they collapse to this. */
export const internalAppErrorData = (): AppErrorData => ({
  code: 'INTERNAL_ERROR',
  messageKey: 'errors.internal',
})
