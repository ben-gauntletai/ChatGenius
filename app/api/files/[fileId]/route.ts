import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 100 // 100ms

async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | Prisma.PrismaClientKnownRequestError | null = null
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      if (error instanceof Error && error.message.includes('connection')) {
        // Wait before retrying, with exponential backoff
        await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, i)))
        continue
      }
      throw error // If it's not a connection error, throw immediately
    }
  }
  throw lastError // If we've exhausted retries, throw the last error
}

export async function GET(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    // Use retry logic for database query
    const file = await retryOperation(async () => {
      return prisma.fileUpload.findUnique({
        where: {
          id: params.fileId
        }
      })
    })

    if (!file) {
      return new NextResponse('File not found', { status: 404 })
    }

    // Check if data starts with http(s):// for external URLs
    if (file.data.startsWith('http://') || file.data.startsWith('https://')) {
      return NextResponse.redirect(file.data)
    }

    // Otherwise return the file data
    return new NextResponse(Buffer.from(file.data, 'base64'), {
      headers: {
        'Content-Type': file.fileType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${file.fileName}"`,
        'Cache-Control': 'public, max-age=31536000' // Cache for 1 year
      }
    })
  } catch (error) {
    console.error('[FILE_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 