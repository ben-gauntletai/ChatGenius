import { PrismaClient } from '@prisma/client'

// Connection queue implementation
class ConnectionQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false
  private static instance: ConnectionQueue

  static getInstance() {
    if (!ConnectionQueue.instance) {
      ConnectionQueue.instance = new ConnectionQueue()
    }
    return ConnectionQueue.instance
  }

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })
      this.process()
    })
  }

  private async process() {
    if (this.processing || this.queue.length === 0) return
    this.processing = true
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift()
      if (operation) {
        try {
          await operation()
        } catch (error) {
          console.error('Queue operation failed:', error)
        }
        // Add small delay between operations
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
    
    this.processing = false
  }
}

let prismaInstance: ExtendedPrismaClient | null = null
const connectionQueue = ConnectionQueue.getInstance()

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
          let lastError: any
          
          const attemptQuery = async () => {
            return connectionQueue.add(async () => {
              try {
                return await query(args)
              } catch (error: any) {
                if (!prismaInstance) throw error
                
                const isConnectionError = 
                  error?.message?.includes('Connection pool timeout') ||
                  error?.message?.includes('Max connections reached') ||
                  error?.message?.includes('socket closed') ||
                  error?.message?.includes('Connection terminated') ||
                  error?.message?.includes('Client has been closed') ||
                  error?.message?.includes('Can\'t reach database server')
                
                if (!isConnectionError) throw error
                
                console.warn(`Database connection error (attempt ${retries + 1}/${MAX_RETRIES}):`, error.message)
                
                // Try to recover the connection
                try {
                  await prismaInstance.$disconnect()
                  await new Promise(resolve => setTimeout(resolve, 1000))
                  await prismaInstance.$connect()
                } catch (reconnectError) {
                  console.error('Failed to reconnect:', reconnectError)
                  // Create a new instance if reconnection fails
                  try {
                    await prismaInstance.$disconnect().catch(() => {})
                    prismaInstance = prismaClientSingleton()
                    await prismaInstance.$connect()
                  } catch (newInstanceError) {
                    console.error('Failed to create new instance:', newInstanceError)
                    throw error
                  }
                }
                
                throw error // Let the retry loop handle it
              }
            })
          }
          
          while (retries < MAX_RETRIES) {
            try {
              if (retries > 0) {
                await new Promise(resolve => 
                  setTimeout(resolve, Math.min(1000 * Math.pow(2, retries), 5000))
                )
              }
              return await attemptQuery()
            } catch (error) {
              lastError = error
              retries++
              if (retries === MAX_RETRIES) break
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

// Clean up any existing connection
if (globalForPrisma.prisma) {
  globalForPrisma.prisma.$disconnect().catch(console.error)
}

// Initialize the singleton instance
prismaInstance = globalForPrisma.prisma ?? prismaClientSingleton()
export const prisma = prismaInstance

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Enhanced cleanup
const cleanup = async () => {
  if (!prismaInstance) return
  
  try {
    await prismaInstance.$disconnect()
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