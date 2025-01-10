import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function GET(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const messageThread = await prisma.thread.findFirst({
      where: {
        messageId: params.messageId
      },
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
    })

    return NextResponse.json(messageThread?.replies || [])
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
    const message = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: { thread: true }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    const thread = message.thread || await prisma.thread.create({
      data: {
        messageId: params.messageId
      }
    })

    // Get the workspace member data
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: message.workspaceId
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
        workspaceId: message.workspaceId,
        channelId: message.channelId,
        threadId: thread.id
      },
      include: {
        reactions: true
      }
    });

    // Format the response
    const formattedMessage = {
      ...threadMessage,
      isThreadReply: true
    };

    // Broadcast the new thread message
    await pusherServer.trigger(
      `thread-${thread.id}`,
      'new-thread-message',
      formattedMessage
    );

    return NextResponse.json(formattedMessage);
  } catch (error) {
    console.error('[THREAD_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 