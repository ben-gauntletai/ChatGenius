import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { emoji } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const message = await prisma.message.findUnique({
      where: { 
        id: params.messageId 
      },
      include: { 
        reactions: true 
      }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: params.messageId,
        userId,
        emoji
      }
    })

    if (existingReaction) {
      // Remove reaction if it exists
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id
        }
      })
    } else {
      // Add new reaction
      await prisma.reaction.create({
        data: {
          emoji,
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          userImage: user.imageUrl,
          messageId: params.messageId
        }
      })
    }

    // Get updated message with reactions
    const updatedMessage = await prisma.message.findUnique({
      where: { 
        id: params.messageId 
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
        updatedMessage
      )
    } else {
      await pusherServer.trigger(
        `channel-${message.channelId}`,
        'message-update',
        updatedMessage
      )
    }

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('[MESSAGE_REACTION]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 