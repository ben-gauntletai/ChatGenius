import { redirect } from 'next/navigation'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export default async function Home() {
  const { userId } = auth()
  const user = await currentUser()

  if (!userId || !user) {
    redirect('/sign-in')
  }

  // Find the default workspace
  const defaultWorkspace = await prisma.workspace.findFirst({
    where: { slug: 'general' },
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
    return <div>Default workspace not found. Please run database seed.</div>
  }

  // Ensure the user is a member of the workspace
  await prisma.workspaceMember.upsert({
    where: {
      userId_workspaceId: {
        userId: userId,
        workspaceId: defaultWorkspace.id
      }
    },
    update: {},
    create: {
      userId: userId,
      userName: `${user.firstName} ${user.lastName}`,
      userImage: user.imageUrl,
      workspaceId: defaultWorkspace.id,
      role: 'MEMBER'
    }
  })

  // Redirect to the first channel
  const firstChannel = defaultWorkspace.channels[0]
  if (firstChannel) {
    redirect(`/${defaultWorkspace.id}/${firstChannel.id}`)
  }

  return null
} 