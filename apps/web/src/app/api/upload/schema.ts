import { z } from 'zod'

const UploadResponseSchema = z.object({
  url: z.url(),
})

const UploadErrorSchema = z.object({
  error: z.string(),
})

export const DeleteRequestSchema = z.object({
  url: z.url(),
})

export type UploadResponse = z.infer<typeof UploadResponseSchema>
export type UploadError = z.infer<typeof UploadErrorSchema>
