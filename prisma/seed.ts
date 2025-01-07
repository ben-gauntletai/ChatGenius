import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create default workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: 'general',
      imageUrl: '/images/workspace-logo.png',
      inviteCode: 'default-invite-code',
      channels: {
        create: [
          {
            name: 'general',
          }
        ]
      }
    }
  })

  console.log('Seed data created:', { workspace })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })