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
    const updateData: any = {};

    // Only update name if provided and not empty
    if (name && name.trim() !== '') {
      updateData.userName = name;
      updateData.hasCustomName = true;
    }

    // Only include imageUrl if it's provided and starts with /api/files/
    if (imageUrl?.startsWith('/api/files/')) {
      console.log('Including image URL in update:', imageUrl);
      updateData.userImage = imageUrl;
      updateData.hasCustomImage = true;
    }

    if (Object.keys(updateData).length === 0) {
      return new NextResponse('No valid updates provided', { status: 400 });
    }

    console.log('Final update data:', updateData);

    // Update all workspace members for this user
    const updatedMember = await prisma.workspaceMember.updateMany({
      where: { userId },
      data: updateData
    });
    console.log('Updated workspace member:', updatedMember);

    // Update all messages sent by this user
    if (updateData.userName || updateData.userImage) {
      const messageUpdateData: any = {};
      if (updateData.userName) messageUpdateData.userName = updateData.userName;
      if (updateData.userImage) messageUpdateData.userImage = updateData.userImage;

      const updatedMessages = await prisma.message.updateMany({
        where: { userId },
        data: messageUpdateData
      });
      console.log('Updated messages:', updatedMessages);

      // Update direct messages data
      const dmUpdateData: any = {};
      if (updateData.userName) {
        dmUpdateData.senderName = updateData.userName;
        dmUpdateData.receiverName = updateData.userName;
      }
      if (updateData.userImage) {
        dmUpdateData.senderImage = updateData.userImage;
        dmUpdateData.receiverImage = updateData.userImage;
      }

      // Update all direct messages sent by this user
      const updatedSentDMs = await prisma.directMessage.updateMany({
        where: { senderId: userId },
        data: {
          ...(updateData.userName && { senderName: updateData.userName }),
          ...(updateData.userImage && { senderImage: updateData.userImage })
        }
      });
      console.log('Updated sent DMs:', updatedSentDMs);

      // Update all direct messages received by this user
      const updatedReceivedDMs = await prisma.directMessage.updateMany({
        where: { receiverId: userId },
        data: {
          ...(updateData.userName && { receiverName: updateData.userName }),
          ...(updateData.userImage && { receiverImage: updateData.userImage })
        }
      });
      console.log('Updated received DMs:', updatedReceivedDMs);
    }

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
            name: updateData.userName,
            imageUrl: updateData.userImage,
            statusText,
            hasCustomName: updateData.hasCustomName,
            hasCustomImage: updateData.hasCustomImage
          }
        )
      )
    );

    return NextResponse.json({
      success: true,
      updates: {
        member: updatedMember
      }
    });
  } catch (error) {
    console.error('[PROFILE_UPDATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 