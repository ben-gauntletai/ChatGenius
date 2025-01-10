import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  const { userId } = auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  console.log('\n=== Workspace Layout - User Session ===')
  console.log('User ID:', userId)
  console.log('Workspace ID:', params.workspaceId)

  // Find existing member
  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: userId,
      workspaceId: params.workspaceId
    }
  })

  console.log('\n=== Current Member Status ===')
  if (existingMember) {
    console.log('Member Found:')
    console.log('Status:', existingMember.status)
  } else {
    console.log('No existing member found')
  }

  // Update member info while preserving status and custom profile
  try {
    const updatedMember = await prisma.workspaceMember.upsert({
      where: {
        id: existingMember?.id || ''
      },
      update: {
        ...(existingMember ? {} : { status: 'ONLINE' })
      },
      create: {
        userId: userId,
        workspaceId: params.workspaceId,
        userName: 'User',
        userImage: '',
        status: 'ONLINE',
        role: 'MEMBER'
      }
    })

    console.log('\n=== Updated Member Info ===')
    console.log('Current Status:', updatedMember.status)
  } catch (error) {
    console.error('\n=== Error Updating Member ===', error)
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    include: { members: true }
  })

  if (!workspace) {
    redirect('/')
  }

  return (
    <>
      {children}
    </>
  )
} 