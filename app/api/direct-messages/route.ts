import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { content, receiverId, workspaceId, fileUrl, fileName, fileType } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Validate workspaceId
    if (!workspaceId) {
      console.log('Missing workspaceId:', { content, receiverId, workspaceId });
      return new NextResponse('WorkspaceId is required', { status: 400 })
    }

    // Get receiver details
    const receiver = await prisma.workspaceMember.findFirst({
      where: {
        userId: receiverId,
        workspaceId: workspaceId
      }
    })

    if (!receiver) {
      return new NextResponse('Receiver not found', { status: 404 })
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl,
        fileName,
        fileType,
        senderId: userId,
        senderName: `${user.firstName} ${user.lastName}`,
        senderImage: user.imageUrl,
        receiverId: receiver.userId,
        receiverName: receiver.userName,
        receiverImage: receiver.userImage,
        workspaceId: workspaceId
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
      userId: message.senderId,
      userName: message.senderName,
      userImage: message.senderImage,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      reactions: message.reactions
    }

    // Trigger Pusher event with formatted message
    const channelName = `dm-${[userId, receiverId].sort().join('-')}`
    await pusherServer.trigger(channelName, 'new-message', formattedMessage)

    return NextResponse.json(formattedMessage)
  } catch (error) {
    console.log('[DIRECT_MESSAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 