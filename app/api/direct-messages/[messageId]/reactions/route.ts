import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    const { emoji } = await req.json()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get the message first
    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      include: { reactions: true }
    })

    if (!message) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Get the workspace member data
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: message.workspaceId
      },
      select: {
        userName: true,
        userImage: true
      }
    })

    if (!member) {
      return new NextResponse('Member not found', { status: 404 })
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        userId,
        directMessageId: params.messageId,
        emoji
      }
    });

    if (existingReaction) {
      // If reaction exists, delete it
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id
        }
      });
    } else {
      // Create reaction with workspace member data
      const reactionData: any = {
        emoji,
        userId,
        userName: member.userName || 'User',
        directMessageId: params.messageId
      };

      if (member.userImage?.startsWith('/api/files/')) {
        reactionData.userImage = member.userImage;
      }

      const reaction = await prisma.reaction.create({
        data: reactionData
      });
    }

    // Get the updated message with reactions
    const updatedMessage = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      include: { reactions: true }
    });

    if (!updatedMessage) {
      return new NextResponse('Message not found', { status: 404 });
    }

    // Create the response with preserved message data
    const response = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      userId: message.senderId,
      userName: message.senderName,
      userImage: message.senderImage,
      reactions: updatedMessage.reactions,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      isEdited: message.updatedAt !== message.createdAt,
      senderId: message.senderId,
      senderName: message.senderName,
      senderImage: message.senderImage,
      receiverId: message.receiverId,
      receiverName: message.receiverName,
      receiverImage: message.receiverImage
    };

    // Get the channel name for the DM
    const channelName = `dm-${[message.senderId, message.receiverId].sort().join('-')}`;

    console.log('Broadcasting message update:', response);

    // Broadcast the update
    await pusherServer.trigger(
      channelName,
      'message-update',
      response
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DIRECT_MESSAGE_REACTIONS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth();
    const { emoji } = await req.json();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Delete the reaction
    await prisma.reaction.deleteMany({
      where: {
        userId,
        directMessageId: params.messageId,
        emoji
      }
    });

    // Get updated message with reactions
    const message = await prisma.directMessage.findUnique({
      where: { id: params.messageId },
      include: { reactions: true }
    });

    if (!message) {
      return new NextResponse('Message not found', { status: 404 });
    }

    // Create the response with preserved message data
    const response = {
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
      isEdited: message.updatedAt !== message.createdAt
    };

    // Get the channel name for the DM
    const channelName = `dm-${[message.senderId, message.receiverId].sort().join('-')}`;

    // Broadcast the update
    await pusherServer.trigger(
      channelName,
      'message-update',
      response
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DIRECT_MESSAGE_REACTION_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 