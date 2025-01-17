import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 100 // 100ms
const QUERY_TIMEOUT = 5000 // 5 second timeout for file queries

async function retryOperation<T>(operation: () => Promise<T>): Promise<T> {
  let lastError: Error | Prisma.PrismaClientKnownRequestError | null = null
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      // Wrap the operation in a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), QUERY_TIMEOUT)
      })
      
      // Race between the operation and the timeout
      const result = await Promise.race([
        operation(),
        timeoutPromise
      ]) as T

      return result
    } catch (error) {
      lastError = error as Error
      if (error instanceof Error && (error.message.includes('connection') || error.message.includes('timeout'))) {
        console.log(`Retry attempt ${i + 1} after error:`, error.message)
        // Wait before retrying, with exponential backoff
        await new Promise(resolve => setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, i)))
        continue
      }
      throw error // If it's not a connection/timeout error, throw immediately
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
    if (error instanceof Error && error.message.includes('timeout')) {
      return new NextResponse('Request timeout', { status: 408 })
    }
    return new NextResponse('Internal Error', { status: 500 })
  }
} 