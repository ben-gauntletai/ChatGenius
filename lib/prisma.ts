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
          const MAX_RETRIES = 3
          let retries = 0
          
          while (retries < MAX_RETRIES) {
            try {
              return await query(args)
            } catch (error: any) {
              if (
                error?.message?.includes('Connection pool timeout') ||
                error?.message?.includes('Max connections reached') ||
                error?.message?.includes('socket closed') ||
                error?.message?.includes('Connection terminated')
              ) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)))
                retries++
                
                // Force a new connection
                try {
                  await prisma.$disconnect()
                  await new Promise(resolve => setTimeout(resolve, 100))
                  await prisma.$connect()
                } catch (reconnectError) {
                  console.error('Reconnection failed:', reconnectError)
                }
                
                if (retries === MAX_RETRIES) throw error
                continue
              }
              throw error
            }
          }
          throw new Error('Max retries reached')
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
  globalForPrisma.prisma.$disconnect()
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

process.on('beforeExit', cleanup)
process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)