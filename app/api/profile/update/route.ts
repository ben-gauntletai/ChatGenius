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

    // Create update data object based on what's provided
    const updateData: any = {
      userName: name,
    };

    // Only include imageUrl if it's provided
    if (imageUrl) {
      updateData.userImage = imageUrl;
    }

    // Update all workspace members for this user
    await prisma.workspaceMember.updateMany({
      where: { userId },
      data: updateData
    });

    // Update all messages sent by this user
    await prisma.message.updateMany({
      where: { userId },
      data: updateData
    });

    // Update direct messages data
    const dmUpdateData = {
      ...updateData,
      senderName: name,
      receiverName: name,
    };
    if (imageUrl) {
      dmUpdateData.senderImage = imageUrl;
      dmUpdateData.receiverImage = imageUrl;
    }

    // Update all direct messages sent by this user
    await prisma.directMessage.updateMany({
      where: { senderId: userId },
      data: {
        senderName: name,
        ...(imageUrl && { senderImage: imageUrl })
      }
    });

    // Update all direct messages received by this user
    await prisma.directMessage.updateMany({
      where: { receiverId: userId },
      data: {
        receiverName: name,
        ...(imageUrl && { receiverImage: imageUrl })
      }
    });

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PROFILE_UPDATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 