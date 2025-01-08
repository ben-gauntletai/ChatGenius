import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'
import { UserStatus } from '@prisma/client'

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
    console.log('\n--- Status Update Request ---')
    console.log('User ID:', userId)
    console.log('Workspace ID:', params.workspaceId)
    console.log('Requested Status:', status)

    // Validate status value
    if (!Object.values(UserStatus).includes(status.toUpperCase() as UserStatus)) {
      console.error('Invalid status value:', status)
      return new NextResponse('Invalid status value', { status: 400 })
    }

    const statusEnum = status.toUpperCase() as UserStatus

    // Changed from findUnique to findFirst
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: userId,
        workspaceId: params.workspaceId
      }
    })

    console.log('\n--- Found Member ---')
    console.log(member)

    if (!member) {
      console.error('\n--- Member Not Found ---')
      console.error('Cannot find member with:')
      console.error(`- User ID: ${userId}`)
      console.error(`- Workspace ID: ${params.workspaceId}`)
      return new NextResponse('Member not found', { status: 404 })
    }

    // Update the status using the member's id
    const updatedMember = await prisma.workspaceMember.update({
      where: {
        id: member.id
      },
      data: { 
        status: statusEnum,
        statusUpdatedAt: new Date()
      }
    })

    console.log('\n--- Updated Member ---')
    console.log(updatedMember)

    // Broadcast status change
    await pusherServer.trigger(
      `workspace-${params.workspaceId}`,
      'member-status-update',
      { userId, status: statusEnum }
    )

    return NextResponse.json(updatedMember)
  } catch (error) {
    console.error('\n--- Error in Status Update ---')
    console.error('Error details:', error)
    return new NextResponse(`Internal Error: ${error.message}`, { status: 500 })
  }
} 