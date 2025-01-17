import { PrismaClient } from '@prisma/client'

declare global {
  var prisma: PrismaClient | undefined
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.NODE_ENV === 'production'
          ? process.env.DATABASE_URL  // Use pooling in production
          : process.env.DIRECT_URL    // Use direct connection in development
      }
    },
    // Add logging in development
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : []
  })
}

const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma

export { prisma }