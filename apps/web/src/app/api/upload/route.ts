import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { R2_BUCKET, R2_PUBLIC_URL, r2Client } from '~/server/r2'
import { DeleteRequestSchema, type UploadError, type UploadResponse } from './schema'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

const UploadConfigSchema = z.object({
  allowedTypes: z.array(z.string()),
  maxSize: z.number(),
})

const uploadConfig = UploadConfigSchema.parse({
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  maxSize: MAX_FILE_SIZE,
})

const extractKeyFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url)
    // Remove leading slash from pathname
    return urlObj.pathname.slice(1)
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const articleIdRaw = formData.get('articleId')
    const productIdRaw = formData.get('productId')
    const articleId = typeof articleIdRaw === 'string' ? articleIdRaw.trim() : ''
    const productId = typeof productIdRaw === 'string' ? productIdRaw.trim() : ''

    if (articleId && productId) {
      return NextResponse.json<UploadError>({ error: 'Provide only one of articleId or productId' }, { status: 400 })
    }

    if (productId && !z.uuid().safeParse(productId).success) {
      return NextResponse.json<UploadError>({ error: 'Invalid productId' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json<UploadError>({ error: 'No file provided' }, { status: 400 })
    }

    if (!uploadConfig.allowedTypes.includes(file.type)) {
      return NextResponse.json<UploadError>(
        { error: 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP' },
        { status: 400 }
      )
    }

    if (file.size > uploadConfig.maxSize) {
      return NextResponse.json<UploadError>({ error: 'File too large. Maximum size: 5MB' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const extension = file.name.split('.').pop() ?? 'jpg'
    const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`

    const folder = articleId ? `articles/${articleId}` : productId ? `products/${productId}` : 'unsorted'
    const key = `${folder}/${filename}`

    await r2Client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type,
      })
    )

    const url = `${R2_PUBLIC_URL}/${key}`

    return NextResponse.json<UploadResponse>({ url })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json<UploadError>({ error: 'Failed to upload file' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const validation = DeleteRequestSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json<UploadError>({ error: 'Invalid request. URL is required.' }, { status: 400 })
    }

    const { url } = validation.data
    const key = extractKeyFromUrl(url)

    if (!key) {
      return NextResponse.json<UploadError>({ error: 'Invalid URL format' }, { status: 400 })
    }

    await r2Client.send(
      new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
      })
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    return NextResponse.json<UploadError>({ error: 'Failed to delete file' }, { status: 500 })
  }
}
