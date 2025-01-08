import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/lib/pusher'

export async function PATCH(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = auth()
    const { status } = await req.json()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Validate status
    const validStatuses = ['ONLINE', 'AWAY', 'BUSY', 'OFFLINE']
    if (!validStatuses.includes(status)) {
      return new NextResponse('Invalid status', { status: 400 })
    }

    // Update both status and lastManualStatus
    const member = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: params.workspaceId,
          userId: userId,
        },
      },
      data: {
        status: status,
        lastManualStatus: status, // Using the correct field name
      },
    })

    // Broadcast the status update
    pusherServer.trigger(
      `workspace-${params.workspaceId}`,
      'member-status-update',
      { userId, status }
    )

    return NextResponse.json(member)
  } catch (error) {
    console.error('[STATUS_UPDATE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 