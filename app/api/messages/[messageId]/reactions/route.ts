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
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const { emoji } = await req.json()

    // Get the message to get its channelId
    const message = await prisma.message.findUnique({
      where: { id: params.messageId },
      select: { channelId: true }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Find existing reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: params.messageId,
        userId: userId,
        emoji: emoji
      }
    })

    if (existingReaction) {
      // Delete the reaction
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id
        }
      })
    } else {
      // Create new reaction
      await prisma.reaction.create({
        data: {
          emoji,
          userId,
          userName: user.firstName ?? 'Unknown User',
          messageId: params.messageId
        }
      })
    }

    // Fetch updated message with reactions
    const updatedMessage = await prisma.message.findUnique({
      where: { 
        id: params.messageId 
      },
      include: {
        reactions: true
      }
    })

    // Format the message to match the expected structure
    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      createdAt: updatedMessage.createdAt,
      userId: updatedMessage.userId,
      userName: updatedMessage.userName,
      userImage: updatedMessage.userImage,
      channelId: updatedMessage.channelId,
      reactions: updatedMessage.reactions
    }

    // Trigger Pusher event
    await pusherServer.trigger(
      `channel-${message.channelId}`,
      'message-updated',
      formattedMessage
    )

    return NextResponse.json(formattedMessage)
  } catch (error) {
    console.error('[MESSAGE_REACTION_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 