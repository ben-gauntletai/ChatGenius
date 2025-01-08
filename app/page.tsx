import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const { userId } = auth()
  const user = await currentUser()

  if (!userId || !user) {
    redirect('/sign-in')
  }

  console.log('\n=== User Login Session Start ===')
  console.log('User ID:', userId)
  console.log('User Name:', `${user.firstName} ${user.lastName}`)

  // Find the default workspace
  const defaultWorkspace = await prisma.workspace.findFirst({
    where: {
      name: 'Default Workspace'
    },
    include: {
      channels: {
        take: 1,
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  })

  if (!defaultWorkspace) {
    console.error('Default workspace not found')
    return <div>Default workspace not found. Please run database seed.</div>
  }

  // Find existing workspace member with their current status
  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: userId,
      workspaceId: defaultWorkspace.id
    }
  })

  console.log('\n=== Member Status Check ===')
  console.log('Existing Member:', existingMember)

  // Create or update workspace member
  try {
    const member = await prisma.workspaceMember.upsert({
      where: {
        userId_workspaceId: {
          userId: userId,
          workspaceId: defaultWorkspace.id
        }
      },
      update: {
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        // Keep existing status if member exists
        ...(existingMember && {
          status: existingMember.status,
          statusUpdatedAt: existingMember.statusUpdatedAt
        })
      },
      create: {
        userId: userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        workspaceId: defaultWorkspace.id,
        role: 'MEMBER',
        status: 'ONLINE',
        statusUpdatedAt: new Date()
      }
    })

    console.log('\n=== Updated Member Status ===')
    console.log('Current Status:', member.status)
    console.log('Status Last Updated:', member.statusUpdatedAt)
  } catch (error) {
    console.error('Error upserting member:', error)
  }

  // Redirect to the first channel
  const firstChannel = defaultWorkspace.channels[0]
  if (firstChannel) {
    redirect(`/${defaultWorkspace.id}/${firstChannel.id}`)
  }

  return null
} 