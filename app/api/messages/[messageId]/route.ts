import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'
import { deleteMessageVectors } from '@/lib/vector-store'

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

    // First get the original message to check if it's a thread message
    const originalMessage = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: {
        reactions: true,
        thread: true
      }
    });

    if (!originalMessage) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Update the message
    const message = await prisma.message.update({
      where: {
        id: params.messageId,
        userId
      },
      data: {
        content
      },
      include: {
        reactions: true,
        thread: true
      }
    })

    // Format the message to ensure consistency with new messages
    const formattedMessage = {
      ...message,
      isThreadReply: !!message.threadId,
      parentMessageId: message.threadId ? originalMessage.thread?.messageId : undefined,
      thread: message.thread ? {
        id: message.thread.id,
        messageId: message.thread.messageId
      } : undefined
    };

    console.log('Sending message update:', {
      messageId: message.id,
      content: message.content,
      threadId: message.threadId,
      isThreadReply: !!message.threadId,
      parentMessageId: message.threadId ? originalMessage.thread?.messageId : undefined,
      thread: formattedMessage.thread
    });

    // Send update to channel
    await pusherServer.trigger(
      `channel-${message.channelId}`,
      'message-update',
      formattedMessage
    );

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

    // Delete the message from the database
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

    // Delete the vector from Pinecone asynchronously
    void (async () => {
      try {
        await deleteMessageVectors([params.messageId]);
      } catch (error: unknown) {
        console.error('[MESSAGE_DELETE] Failed to delete vector:', error);
      }
    })();

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    console.error('[MESSAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 