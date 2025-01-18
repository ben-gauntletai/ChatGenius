import { PrismaClient } from '@prisma/client'

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    },
  }).$extends({
    model: {
      $allModels: {
        async $allOperations<T>({ 
          model, 
          operation, 
          args, 
          query 
        }: { 
          model: string; 
          operation: string; 
          args: unknown; 
          query: (args: unknown) => Promise<T>;
        }): Promise<T> {
          const MAX_RETRIES = 5
          let retries = 0
          let lastError: any
          
          while (retries < MAX_RETRIES) {
            try {
              // Add small delay between retries to prevent overwhelming the connection pool
              if (retries > 0) {
                await new Promise(resolve => setTimeout(resolve, Math.min(100 * Math.pow(2, retries), 2000)))
              }
              
              return await query(args)
            } catch (error: any) {
              lastError = error
              const isConnectionError = 
                error?.message?.includes('Connection pool timeout') ||
                error?.message?.includes('Max connections reached') ||
                error?.message?.includes('socket closed') ||
                error?.message?.includes('Connection terminated') ||
                error?.message?.includes('Client has been closed')
              
              if (isConnectionError) {
                retries++
                console.warn(`Database connection error (attempt ${retries}/${MAX_RETRIES}):`, error.message)
                
                try {
                  await prisma.$disconnect()
                  // Longer delay for connection issues
                  await new Promise(resolve => setTimeout(resolve, 500))
                  await prisma.$connect()
                } catch (reconnectError) {
                  console.error('Reconnection failed:', reconnectError)
                }
                
                continue
              }
              throw error
            }
          }
          
          console.error('All retry attempts failed. Last error:', lastError)
          throw lastError
        },
      },
    },
  })
}

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>

declare global {
  var prisma: ExtendedPrismaClient | undefined
}

const globalForPrisma = global as { prisma?: ExtendedPrismaClient }

// Clean up existing connection
if (globalForPrisma.prisma) {
  globalForPrisma.prisma.$disconnect().catch(console.error)
}

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Enhanced cleanup
const cleanup = async () => {
  try {
    await prisma.$disconnect()
  } catch (e) {
    console.error('Error during cleanup:', e)
  }
}

// Handle all possible termination scenarios
process.on('beforeExit', cleanup)
process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason)
})