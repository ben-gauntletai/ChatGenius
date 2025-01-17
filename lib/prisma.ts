import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Increase max listeners to prevent warnings
process.setMaxListeners(20)

// Configure Prisma Client with error logging
const prismaClient = new PrismaClient({
  log: ['error', 'warn']
})

// Add middleware for regular queries
prismaClient.$use(async (params, next) => {
  // Skip file operations - they have their own middleware
  if (params.model === 'FileUpload') {
    return next(params)
  }

  const MAX_RETRIES = 3
  const INITIAL_RETRY_DELAY = 100 // 100ms
  const QUERY_TIMEOUT = 15000 // 15s timeout for regular queries

  let attempt = 0
  while (attempt < MAX_RETRIES) {
    try {
      // Execute query with timeout
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => 
          setTimeout(() => {
            console.error(`[TIMEOUT] ${params.model}.${params.action} timed out after ${QUERY_TIMEOUT}ms`)
            reject(new Error(`Query timeout: ${params.model}.${params.action}`))
          }, QUERY_TIMEOUT)
        )
      ])

      // Disconnect after successful query
      try {
        await prismaClient.$disconnect()
      } catch (e) {
        console.error('Error disconnecting after query:', e)
      }

      return result
    } catch (error: any) {
      attempt++
      console.error(`[RETRY] ${params.model}.${params.action} attempt ${attempt}/${MAX_RETRIES}:`, error.message)
      
      if (attempt === MAX_RETRIES || !error.message?.includes('connection')) {
        throw error
      }
      // Exponential backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt)
      console.log(`[BACKOFF] Waiting ${delay}ms before retry`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
})

// Add separate middleware for file operations with longer timeout
prismaClient.$use(async (params, next) => {
  if (params.model !== 'FileUpload') {
    return next(params)
  }

  const MAX_RETRIES = 3
  const INITIAL_RETRY_DELAY = 200 // 200ms for files
  const FILE_TIMEOUT = 30000 // 30s timeout for files

  let attempt = 0
  while (attempt < MAX_RETRIES) {
    try {
      // Execute query with timeout
      const result = await Promise.race([
        next(params),
        new Promise((_, reject) => 
          setTimeout(() => {
            console.error(`[FILE_TIMEOUT] FileUpload.${params.action} timed out after ${FILE_TIMEOUT}ms`)
            reject(new Error(`File operation timeout: ${params.action}`))
          }, FILE_TIMEOUT)
        )
      ])

      // Disconnect after successful query
      try {
        await prismaClient.$disconnect()
      } catch (e) {
        console.error('Error disconnecting after file operation:', e)
      }

      return result
    } catch (error: any) {
      attempt++
      console.error(`[FILE_RETRY] FileUpload.${params.action} attempt ${attempt}/${MAX_RETRIES}:`, error.message)
      
      if (attempt === MAX_RETRIES || !error.message?.includes('connection')) {
        throw error
      }
      // Exponential backoff
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt)
      console.log(`[FILE_BACKOFF] Waiting ${delay}ms before retry`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
})

export const prisma = globalForPrisma.prisma ?? prismaClient

// Ensure proper connection handling in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Disconnect Prisma Client on process termination
const disconnectPrisma = async () => {
  try {
    await prisma.$disconnect()
  } catch (error) {
    console.error('Error disconnecting Prisma:', error)
  }
}

// Remove existing listeners before adding new ones
const events = ['beforeExit', 'SIGTERM', 'SIGINT', 'uncaughtException', 'unhandledRejection']
events.forEach(event => {
  process.removeAllListeners(event)
})

// Add single listener for each event
events.forEach(event => {
  process.once(event, disconnectPrisma)
})