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

    const reply = await prisma.message.create({
      data: {
        content,
        channelId: parentMessage.channelId,
        workspaceId,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        threadId: thread.id
      },
      include: {
        reactions: true
      }
    })

    await pusherServer.trigger(
      `thread-${thread.id}`,
      'new-thread-message',
      reply
    )

    return NextResponse.json(reply)
  } catch (error) {
    console.error('[THREAD_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 