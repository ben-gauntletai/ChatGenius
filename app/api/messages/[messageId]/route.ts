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
    const { content } = await req.json()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const message = await prisma.message.update({
      where: {
        id: params.messageId,
        userId // Ensure the user owns the message
      },
      data: {
        content
      },
      include: {
        reactions: true
      }
    })

    // Trigger update for both channel and thread
    if (message.threadId) {
      await pusherServer.trigger(
        `thread-${message.threadId}`,
        'message-update',
        message
      )
    } else {
      await pusherServer.trigger(
        `channel-${message.channelId}`,
        'message-update',
        message
      )
    }

    return NextResponse.json(message)
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

    const message = await prisma.message.findUnique({
      where: {
        id: params.messageId
      }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Only allow message owner to delete
    if (message.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await prisma.message.delete({
      where: {
        id: params.messageId
      }
    })

    // Trigger delete for both channel and thread
    if (message.threadId) {
      await pusherServer.trigger(
        `thread-${message.threadId}`,
        'message-delete',
        { messageId: params.messageId }
      )
    } else {
      await pusherServer.trigger(
        `channel-${message.channelId}`,
        'message-delete',
        { messageId: params.messageId }
      )
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('[MESSAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 