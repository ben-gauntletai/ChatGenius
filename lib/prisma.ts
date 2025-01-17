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

// Add middleware for connection handling
prismaClient.$use(async (params, next) => {
  const MAX_RETRIES = 3
  const INITIAL_RETRY_DELAY = 100 // 100ms

  let attempt = 0
  while (attempt < MAX_RETRIES) {
    try {
      return await Promise.race([
        next(params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 5000) // 5s timeout
        )
      ])
    } catch (error: any) {
      attempt++
      if (attempt === MAX_RETRIES || !error.message?.includes('connection')) {
        throw error
      }
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, INITIAL_RETRY_DELAY * Math.pow(2, attempt))
      )
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