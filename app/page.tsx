import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const { userId } = auth()

  if (!userId) {
    redirect('/sign-in')
  }

  console.log('\n=== User Login Session Start ===')
  console.log('User ID:', userId)

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
        id: existingMember?.id || ''
      },
      update: {
        // Only update status if member exists
        ...(existingMember && {
          status: existingMember.status
        })
      },
      create: {
        userId: userId,
        userName: 'User',
        userImage: '',
        workspaceId: defaultWorkspace.id,
        role: 'MEMBER',
        status: 'ONLINE'
      }
    })

    console.log('\n=== Updated Member Status ===')
    console.log('Current Status:', member.status)
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