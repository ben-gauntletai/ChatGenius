import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'
import { deleteMessageVectors } from '@/lib/vector-store'

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      select: { senderId: true, receiverId: true }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    if (message.senderId !== userId) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Delete from database
    await prisma.directMessage.delete({
      where: { id: params.messageId }
    })

    // Trigger Pusher event for message deletion
    const channelName = `dm-${[message.senderId, message.receiverId].sort().join('-')}`
    await pusherServer.trigger(channelName, 'message-delete', params.messageId)

    // Delete from Pinecone asynchronously
    void (async () => {
      try {
        await deleteMessageVectors([params.messageId]);
      } catch (error: unknown) {
        console.error('[DIRECT_MESSAGE_DELETE] Failed to delete vector:', error);
      }
    })();

    return NextResponse.json({ message: 'Message deleted' })
  } catch (error) {
    console.error('[MESSAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

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

    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      select: { senderId: true, receiverId: true, workspaceId: true }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    if (message.senderId !== userId) {
      return new NextResponse('Forbidden', { status: 403 })
    }

    // Get the latest member data
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: message.senderId,
        workspaceId: message.workspaceId
      }
    });

    if (!member) {
      return new NextResponse('Member not found', { status: 404 });
    }

    const updatedMessage = await prisma.directMessage.update({
      where: { id: params.messageId },
      data: { 
        content,
        senderName: member.userName || 'User',
        senderImage: member.userImage?.startsWith('/api/files/') ? member.userImage : null
      },
      include: { reactions: true }
    })

    // Format the message for Pusher
    const formattedMessage = {
      id: updatedMessage.id,
      content: updatedMessage.content,
      createdAt: updatedMessage.createdAt,
      userId: updatedMessage.senderId,
      userName: member.hasCustomName ? member.userName : 'User',
      userImage: member.hasCustomImage && member.userImage?.startsWith('/api/files/') ? member.userImage : null,
      reactions: updatedMessage.reactions,
      isEdited: updatedMessage.updatedAt !== updatedMessage.createdAt,
      fileUrl: updatedMessage.fileUrl,
      fileName: updatedMessage.fileName,
      fileType: updatedMessage.fileType
    }

    // Trigger Pusher event for message update
    const channelName = `dm-${[message.senderId, message.receiverId].sort().join('-')}`
    await pusherServer.trigger(channelName, 'message-update', formattedMessage)

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('[MESSAGE_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 