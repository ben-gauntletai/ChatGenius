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

    // Only broadcast to the appropriate channel
    if (message.threadId) {
      // If it's a thread message, only broadcast to the thread
      await pusherServer.trigger(
        `thread-${message.threadId}`,
        'message-update',
        message
      )
    } else {
      // If it's a regular message, broadcast to the channel
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
      },
      select: {
        userId: true,
        channelId: true,
        threadId: true
      }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    if (message.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await prisma.message.delete({
      where: {
        id: params.messageId
      }
    })

    // Trigger delete event for both channel and thread if applicable
    if (message.threadId) {
      await pusherServer.trigger(
        `thread-${message.threadId}`,
        'message-delete',
        params.messageId
      )
    }
    
    await pusherServer.trigger(
      `channel-${message.channelId}`,
      'message-delete',
      params.messageId
    )

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('[MESSAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 