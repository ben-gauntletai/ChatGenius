import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export default async function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  const { userId } = auth()
  const user = await currentUser()
  
  if (!userId || !user) {
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
        status: 'ONLINE',
        ...(existingMember?.userName ? {} : { userName: user.firstName + ' ' + user.lastName }),
        ...(existingMember?.userImage ? {} : { userImage: user.imageUrl })
      },
      create: {
        userId: userId,
        workspaceId: params.workspaceId,
        userName: user.firstName + ' ' + user.lastName,
        userImage: user.imageUrl,
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