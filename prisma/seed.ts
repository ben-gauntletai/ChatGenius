import { PrismaClient } from '@prisma/client'
import { v4 as uuidv4 } from 'uuid'

const prisma = new PrismaClient()

async function main() {
  try {
    console.log('Starting database seed...')

    // Delete all existing data first
    console.log('Cleaning up existing data...')
    await prisma.reaction.deleteMany()
    await prisma.message.deleteMany()
    await prisma.directMessage.deleteMany()
    await prisma.thread.deleteMany()
    await prisma.channel.deleteMany()
    await prisma.workspace.deleteMany()

    console.log('Creating new workspace...')
    // Create default workspace with a unique invite code
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Default Workspace',
        inviteCode: uuidv4(),
        imageUrl: 'https://utfs.io/f/c4919193-ea4c-4e51-9af3-f5eae2e2c565-1sqqor.svg',
        channels: {
          create: [
            {
              name: 'general',
              description: 'General discussion channel'
            },
            {
              name: 'random',
              description: 'Random discussions'
            }
          ]
        }
      },
      include: {
        channels: true
      }
    })
    
    // Verify the workspace was created
    const createdWorkspace = await prisma.workspace.findFirst({
      where: {
        name: 'Default Workspace'
      }
    })
    
    console.log('Created workspace:', createdWorkspace)

  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })