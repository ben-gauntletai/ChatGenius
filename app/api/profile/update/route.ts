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

    // Get current member data first
    const currentMember = await prisma.workspaceMember.findFirst({
      where: { userId }
    });

    // Create update data object based on what's provided
    const updateData: any = {};

    // Only update name if provided and not empty
    if (name && name.trim() !== '') {
      updateData.userName = name.trim();
      updateData.hasCustomName = true;
    }

    // Only include imageUrl if it's provided and starts with /api/files/
    if (imageUrl?.startsWith('/api/files/')) {
      console.log('Including image URL in update:', imageUrl);
      updateData.userImage = imageUrl;
      updateData.hasCustomImage = true;
    }

    // If imageUrl is explicitly null, remove custom image
    if (imageUrl === null) {
      updateData.userImage = '';
      updateData.hasCustomImage = false;
    }

    if (Object.keys(updateData).length === 0) {
      return new NextResponse('No valid updates provided', { status: 400 });
    }

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

      // Get all messages by this user
      const userMessages = await prisma.message.findMany({
        where: { userId },
        include: { reactions: true }
      });

      // Update messages and broadcast updates
      await Promise.all(userMessages.map(async (message) => {
        // Update the message
        const updatedMessage = await prisma.message.update({
          where: { id: message.id },
          data: messageUpdateData,
          include: { reactions: true }
        });

        // Broadcast update to channel
        await pusherServer.trigger(
          `channel-${message.channelId}`,
          'message-update',
          {
            ...updatedMessage,
            userName: updateData.userName,
            userImage: updateData.userImage
          }
        );
      }));

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

      // Get all direct messages by this user
      const sentDMs = await prisma.directMessage.findMany({
        where: { senderId: userId },
        include: { reactions: true }
      });

      const receivedDMs = await prisma.directMessage.findMany({
        where: { receiverId: userId },
        include: { reactions: true }
      });

      // Update and broadcast sent DMs
      await Promise.all(sentDMs.map(async (dm) => {
        const updatedDM = await prisma.directMessage.update({
          where: { id: dm.id },
          data: {
            ...(updateData.userName && { senderName: updateData.userName }),
            ...(updateData.userImage && { senderImage: updateData.userImage })
          },
          include: { reactions: true }
        });

        await pusherServer.trigger(
          `dm-${[dm.senderId, dm.receiverId].sort().join('-')}`,
          'message-update',
          {
            ...updatedDM,
            userName: updateData.userName,
            userImage: updateData.userImage
          }
        );
      }));

      // Update and broadcast received DMs
      await Promise.all(receivedDMs.map(async (dm) => {
        const updatedDM = await prisma.directMessage.update({
          where: { id: dm.id },
          data: {
            ...(updateData.userName && { receiverName: updateData.userName }),
            ...(updateData.userImage && { receiverImage: updateData.userImage })
          },
          include: { reactions: true }
        });

        await pusherServer.trigger(
          `dm-${[dm.senderId, dm.receiverId].sort().join('-')}`,
          'message-update',
          {
            ...updatedDM,
            userName: updateData.userName,
            userImage: updateData.userImage
          }
        );
      }));
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