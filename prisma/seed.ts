import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Clear existing data
  await prisma.message.deleteMany()
  await prisma.channel.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()

  // Create default workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "General Workspace",
      slug: "general", // This is important as we search by this slug
      channels: {
        create: [
          {
            name: "general",
            description: "General discussion channel"
          },
          {
            name: "random",
            description: "Random conversations"
          }
        ]
      }
    }
  })

  console.log('Seed data created:', { workspace })
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })