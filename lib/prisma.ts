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
                error?.message?.includes('Max connections reached')
              ) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, retries)))
                retries++
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
export const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

process.on('beforeExit', async () => {
  await prisma.$disconnect()
})