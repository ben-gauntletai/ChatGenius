import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { content, workspaceId, receiverId, fileUrl, fileName, fileType } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get both sender and receiver workspace member data
    const [sender, receiver] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { userId, workspaceId }
      }),
      prisma.workspaceMember.findFirst({
        where: { userId: receiverId, workspaceId }
      })
    ]);

    if (!receiver) {
      return new NextResponse('Receiver not found', { status: 404 })
    }

    if (!sender) {
      return new NextResponse('Sender not found', { status: 404 })
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl,
        fileName,
        fileType,
        workspaceId,
        senderId: userId,
        senderName: sender.userName,
        senderImage: sender.userImage,
        receiverId,
        receiverName: receiver.userName,
        receiverImage: receiver.userImage,
      },
      include: {
        reactions: true
      }
    })

    const formattedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      userId: message.senderId,
      userName: message.senderName,
      userImage: message.senderImage,
      reactions: message.reactions,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      isEdited: false
    }

    const channelName = `dm-${[userId, receiverId].sort().join('-')}`
    await pusherServer.trigger(channelName, 'new-message', formattedMessage)

    return NextResponse.json(formattedMessage)
  } catch (error) {
    console.error('[DIRECT_MESSAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 