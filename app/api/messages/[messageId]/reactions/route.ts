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

    // Get the message first
    const message = await prisma.message.findUnique({
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
    });

    if (!member) {
      return new NextResponse('Member not found', { status: 404 })
    }

    // Check if reaction already exists
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        userId,
        messageId: params.messageId,
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
        messageId: params.messageId
      };

      if (member.userImage?.startsWith('/api/files/')) {
        reactionData.userImage = member.userImage;
      }

      const reaction = await prisma.reaction.create({
        data: reactionData
      });
    }

    // Get the updated message with reactions
    const updatedMessage = await prisma.message.findUnique({
      where: { id: params.messageId },
      include: { 
        reactions: true
      }
    });

    if (!updatedMessage) {
      return new NextResponse('Message not found', { status: 404 })
    }

    // Create the response with preserved message data
    const response = {
      ...message,
      reactions: updatedMessage.reactions
    };

    // Broadcast the update
    await pusherServer.trigger(
      `channel-${message.channelId}`,
      'message-update',
      response
    );

    return NextResponse.json(response);
  } catch (error) {
    console.error('[REACTIONS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 