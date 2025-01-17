import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Increase max listeners to prevent warnings
process.setMaxListeners(20)

// Configure Prisma Client with error logging
export const prisma = globalForPrisma.prisma ?? 
  new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty'
  })

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