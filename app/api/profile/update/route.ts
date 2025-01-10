import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { name, imageUrl, statusText } = await req.json();
    console.log('Received profile update:', { name, imageUrl, statusText });

    // Create update data object based on what's provided
    const updateData: any = {
      userName: name,
    };

    // Only include imageUrl if it's provided and not null/undefined
    if (imageUrl) {
      console.log('Including image URL in update:', imageUrl);
      updateData.userImage = imageUrl;
    }

    console.log('Final update data:', updateData);

    // Update all workspace members for this user
    const updatedMember = await prisma.workspaceMember.updateMany({
      where: { userId },
      data: updateData
    });
    console.log('Updated workspace member:', updatedMember);

    // Update all messages sent by this user
    const updatedMessages = await prisma.message.updateMany({
      where: { userId },
      data: {
        userName: name,
        ...(imageUrl && { userImage: imageUrl })
      }
    });
    console.log('Updated messages:', updatedMessages);

    // Update direct messages data
    const dmUpdateData = {
      senderName: name,
      receiverName: name,
      ...(imageUrl && {
        senderImage: imageUrl,
        receiverImage: imageUrl
      })
    };

    // Update all direct messages sent by this user
    const updatedSentDMs = await prisma.directMessage.updateMany({
      where: { senderId: userId },
      data: {
        senderName: name,
        ...(imageUrl && { senderImage: imageUrl })
      }
    });
    console.log('Updated sent DMs:', updatedSentDMs);

    // Update all direct messages received by this user
    const updatedReceivedDMs = await prisma.directMessage.updateMany({
      where: { receiverId: userId },
      data: {
        receiverName: name,
        ...(imageUrl && { receiverImage: imageUrl })
      }
    });
    console.log('Updated received DMs:', updatedReceivedDMs);

    // Get all workspaces the user is a member of
    const workspaces = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    // Broadcast the update to all relevant workspaces
    await Promise.all(
      workspaces.map(workspace => 
        pusherServer.trigger(
          `workspace-${workspace.workspaceId}`,
          'profile-update',
          {
            userId,
            name,
            imageUrl,
            statusText
          }
        )
      )
    );

    return NextResponse.json({
      success: true,
      updates: {
        member: updatedMember,
        messages: updatedMessages,
        sentDMs: updatedSentDMs,
        receivedDMs: updatedReceivedDMs
      }
    });
  } catch (error) {
    console.error('[PROFILE_UPDATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 