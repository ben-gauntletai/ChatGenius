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

    // Get the direct message to get sender and receiver IDs
    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    const reaction = await prisma.reaction.create({
      data: {
        emoji,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        directMessage: {
          connect: { id: params.messageId }
        }
      }
    })

    // Get updated message with reactions and format it
    const updatedMessage = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      include: {
        reactions: true
      }
    })

    if (!updatedMessage) {
      return new NextResponse('Message not found', { status: 404 })
    }

    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      createdAt: updatedMessage.createdAt,
      userId: updatedMessage.senderId,
      userName: updatedMessage.senderName,
      userImage: updatedMessage.senderImage,
      reactions: updatedMessage.reactions
    }

    // Trigger Pusher event with formatted message
    const channelName = `dm-${[message.senderId, message.receiverId].sort().join('-')}`
    await pusherServer.trigger(channelName, 'message-updated', formattedMessage)

    return NextResponse.json(formattedMessage)
  } catch (error) {
    console.error('[DIRECT_MESSAGE_REACTION_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string; reactionId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await prisma.reaction.delete({
      where: { id: params.reactionId }
    })

    // Get updated message with reactions
    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      include: { reactions: true }
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('[DIRECT_MESSAGE_REACTION_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 