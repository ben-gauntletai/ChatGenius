import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'
import { storeMessagesAsVectors } from '@/lib/vector-store'

export async function GET(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    // Get the parent message and its thread messages
    const parentMessage = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: {
        reactions: true,
        thread: {
          include: {
            replies: {
              include: {
                reactions: true
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        }
      }
    })

    if (!parentMessage) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Format the response to include both parent message and replies
    const threadMessages = [
      parentMessage,
      ...(parentMessage.thread?.replies || [])
    ]

    return NextResponse.json(threadMessages)
  } catch (error) {
    console.error('[THREAD_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { content, workspaceId, isDM } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    if (isDM) {
      return new NextResponse('Threads are not supported for direct messages', { status: 400 })
    }

    // Handle regular message thread
    const parentMessage = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: { thread: true }
    })

    if (!parentMessage) {
      return new NextResponse('Message not found', { status: 404 })
    }

    const thread = parentMessage.thread || await prisma.thread.create({
      data: {
        messageId: params.messageId
      }
    })

    // Get the workspace member data
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: parentMessage.workspaceId
      }
    })

    if (!member) {
      return new NextResponse('Member not found', { status: 404 })
    }

    // Create thread message with workspace member data
    const threadMessage = await prisma.message.create({
      data: {
        content,
        userId,
        userName: member.userName || 'User',
        userImage: member.userImage?.startsWith('/api/files/') ? member.userImage : '',
        workspaceId: parentMessage.workspaceId,
        channelId: parentMessage.channelId,
        threadId: thread.id,
        isThreadReply: true,
        parentMessageId: params.messageId
      },
      include: {
        reactions: true,
        thread: true
      }
    });

    // Get the updated reply count
    const replyCount = await prisma.message.count({
      where: { threadId: thread.id }
    });

    // Update the parent message in the database to include thread info
    const updatedParentMessage = await prisma.message.update({
      where: { id: params.messageId },
      data: {
        replyCount
      },
      include: {
        reactions: true,
        thread: true
      }
    });

    // Format the messages for the response
    const formattedThreadMessage = {
      ...threadMessage,
      isThreadReply: true,
      parentMessageId: params.messageId
    };

    const formattedParentMessage = {
      ...updatedParentMessage,
      replyCount
    };

    // Send the thread message to the channel
    await pusherServer.trigger(
      `channel-${parentMessage.channelId}`,
      'new-message',
      formattedThreadMessage
    );

    // Send the parent message update to the channel
    await pusherServer.trigger(
      `channel-${parentMessage.channelId}`,
      'message-update',
      formattedParentMessage
    );

    // Vectorize the thread message asynchronously
    void (async () => {
      try {
        await storeMessagesAsVectors([threadMessage]);
        console.log('[THREAD_POST] Message vectorized:', threadMessage.id);
      } catch (error: unknown) {
        console.error('[THREAD_POST] Failed to vectorize message:', error);
      }
    })();

    return NextResponse.json(formattedThreadMessage);
  } catch (error) {
    console.error('[THREAD_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 