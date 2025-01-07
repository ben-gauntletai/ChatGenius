import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function PATCH(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { content } = await req.json()

    // Verify message ownership
    const message = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: { reactions: true }
    })

    if (!message || message.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: params.messageId },
      data: { content },
      include: { reactions: true }
    })

    // Format the message for Pusher
    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      createdAt: updatedMessage.createdAt,
      userId: updatedMessage.userId,
      userName: updatedMessage.userName,
      userImage: updatedMessage.userImage,
      channelId: updatedMessage.channelId,
      reactions: updatedMessage.reactions,
      fileUrl: updatedMessage.fileUrl,
      fileName: updatedMessage.fileName,
      fileType: updatedMessage.fileType
    }

    // Trigger Pusher event
    await pusherServer.trigger(
      `channel-${message.channelId}`,
      'message-update',
      formattedMessage
    )

    return NextResponse.json(formattedMessage)
  } catch (error) {
    console.error('[MESSAGE_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Verify message ownership and get channelId
    const message = await prisma.message.findUnique({
      where: { id: params.messageId },
      select: { userId: true, channelId: true }
    })

    if (!message || message.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await prisma.message.delete({
      where: { id: params.messageId }
    })

    // Trigger Pusher event for deletion
    await pusherServer.trigger(
      `channel-${message.channelId}`,
      'message-delete',
      params.messageId
    )

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[MESSAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 