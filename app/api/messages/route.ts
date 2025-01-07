import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { content, channelId } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // First, get the channel to get its workspaceId
    const channel = await prisma.channel.findUnique({
      where: { id: channelId }
    })

    if (!channel) {
      return new NextResponse('Channel not found', { status: 404 })
    }
    
    const message = await prisma.message.create({
      data: {
        content,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        channel: {
          connect: { id: channelId }
        },
        workspace: {
          connect: { id: channel.workspaceId }
        }
      },
      include: {
        reactions: true
      }
    })

    // Format the message to match the expected structure
    const formattedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      userId: message.userId,
      userName: message.userName,
      userImage: message.userImage,
      channelId: message.channelId,
      reactions: message.reactions
    }

    // Trigger pusher event with formatted message
    await pusherServer.trigger(
      `channel-${channelId}`,
      'new-message',
      formattedMessage
    )

    return NextResponse.json(formattedMessage)
  } catch (error) {
    console.log('[MESSAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 