import { PrismaClient } from '@prisma/client'

// Set max listeners at the top level
process.setMaxListeners(20)

// Connection queue implementation
class ConnectionQueue {
  private queue: Array<{
    operation: () => Promise<any>;
    priority: number;
    timestamp: number;
  }> = []
  private processing = false
  private static instance: ConnectionQueue
  private timeout: number = process.env.NODE_ENV === 'production' ? 15000 : 30000
  private maxQueueSize: number = process.env.NODE_ENV === 'production' ? 100 : 200
  private maxConcurrent: number = 3 // Max concurrent operations

  static getInstance() {
    if (!ConnectionQueue.instance) {
      ConnectionQueue.instance = new ConnectionQueue()
    }
    return ConnectionQueue.instance
  }

  async add<T>(operation: () => Promise<T>, priority: number = 0): Promise<T> {
    if (this.queue.length >= this.maxQueueSize) {
      // Remove oldest low-priority items if queue is full
      const oldestLowPriority = this.queue
        .filter(item => item.priority <= priority)
        .sort((a, b) => a.timestamp - b.timestamp)[0]
      
      if (oldestLowPriority) {
        const index = this.queue.indexOf(oldestLowPriority)
        this.queue.splice(index, 1)
      } else {
        throw new Error('Connection queue is full')
      }
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.queue.findIndex(item => item.operation === queuedOperation)
        if (index !== -1) {
          this.queue.splice(index, 1)
          reject(new Error('Operation timed out in queue'))
        }
      }, this.timeout)

      const queuedOperation = async () => {
        try {
          const result = await Promise.race<T>([
            operation(),
            new Promise<T>((_, reject) => 
              setTimeout(() => reject(new Error('Query timeout')), this.timeout)
            )
          ])
          clearTimeout(timeoutId)
          resolve(result)
        } catch (error) {
          clearTimeout(timeoutId)
          reject(error)
        }
      }

      this.queue.push({
        operation: queuedOperation,
        priority,
        timestamp: Date.now()
      })

      // Sort queue by priority (higher first) and timestamp
      this.queue.sort((a, b) => 
        b.priority - a.priority || a.timestamp - b.timestamp
      )

      if (!this.processing) {
        this.process().catch(console.error)
      }
    })
  }

  private async process() {
    if (this.processing) return
    this.processing = true
    
    try {
      while (this.queue.length > 0) {
        // Process up to maxConcurrent operations
        const batch = this.queue.splice(0, this.maxConcurrent)
        await Promise.all(
          batch.map(async ({ operation }) => {
            try {
              await operation()
            } catch (error: any) {
              if (error?.message !== 'Operation timed out in queue') {
                console.error('Queue operation failed:', error)
              }
            }
          })
        )

        // Small delay between batches
        if (this.queue.length > 0) {
          await new Promise(resolve => 
            setTimeout(resolve, process.env.NODE_ENV === 'production' ? 50 : 100)
          )
        }
      }
    } finally {
      this.processing = false
      if (this.queue.length > 0) {
        this.process().catch(console.error)
      }
    }
  }

  getQueueStats() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.processing,
      maxSize: this.maxQueueSize,
      maxConcurrent: this.maxConcurrent
    }
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
          const MAX_RETRIES = process.env.NODE_ENV === 'production' ? 4 : 5
          let retries = 0
          let lastError: any
          
          const attemptQuery = async () => {
            // Determine query priority based on operation type
            const isPriority = 
              model.toLowerCase().includes('user') || 
              model.toLowerCase().includes('member') ||
              model.toLowerCase().includes('workspace') ||
              operation.toLowerCase().includes('find') ||
              operation.toLowerCase().includes('count')

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
                  error?.message?.includes('Can\'t reach database server') ||
                  error?.message?.includes('Query timeout') ||
                  error?.message?.includes('Operation timed out') ||
                  error?.message?.includes('Connection queue is full')
                
                if (!isConnectionError) throw error
                
                const stats = connectionQueue.getQueueStats()
                console.warn(
                  `Database connection error (attempt ${retries + 1}/${MAX_RETRIES}):`, 
                  error.message,
                  `Queue stats: ${JSON.stringify(stats)}`,
                  `Model: ${model}, Operation: ${operation}`
                )
                
                // Try to recover the connection
                try {
                  await prismaInstance.$disconnect()
                  await new Promise(resolve => 
                    setTimeout(resolve, process.env.NODE_ENV === 'production' ? 200 : 1000)
                  )
                  await prismaInstance.$connect()
                } catch (reconnectError) {
                  console.error('Failed to reconnect:', reconnectError)
                  try {
                    await prismaInstance.$disconnect().catch(() => {})
                    prismaInstance = prismaClientSingleton()
                    await prismaInstance.$connect()
                  } catch (newInstanceError) {
                    console.error('Failed to create new instance:', newInstanceError)
                    throw error
                  }
                }
                
                throw error
              }
            }, isPriority ? 1 : 0) // Higher priority for important operations
          }
          
          while (retries < MAX_RETRIES) {
            try {
              if (retries > 0) {
                // Shorter delays in production
                const delay = process.env.NODE_ENV === 'production'
                  ? Math.min(200 * Math.pow(2, retries), 1000)
                  : Math.min(1000 * Math.pow(2, retries), 5000)
                await new Promise(resolve => setTimeout(resolve, delay))
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
const setupEventHandlers = () => {
  const handlers = ['beforeExit', 'SIGTERM', 'SIGINT']
  handlers.forEach(event => {
    // Remove any existing listeners
    process.removeAllListeners(event)
    // Add our cleanup handler
    process.on(event, cleanup)
  })

  // Remove existing unhandledRejection listeners
  process.removeAllListeners('unhandledRejection')
  // Add single unhandledRejection handler
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason)
  })
}

setupEventHandlers()