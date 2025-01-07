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