import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { status } = await req.json()

    const member = await prisma.workspaceMember.update({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: params.workspaceId
        }
      },
      data: { status }
    })

    // Broadcast status change to all workspace members
    await pusherServer.trigger(
      `workspace-${params.workspaceId}`,
      'member-status-update',
      { userId, status }
    )

    return NextResponse.json(member)
  } catch (error) {
    console.error('[MEMBER_STATUS_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 