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

    const { userName, status, statusText, imageUrl } = await req.json();

    // Find all workspace memberships for the user
    const members = await prisma.workspaceMember.findMany({
      where: { userId }
    });

    // Update all memberships
    for (const member of members) {
      const updatedMember = await prisma.workspaceMember.update({
        where: { id: member.id },
        data: {
          userName: userName || 'User',
          status: status || member.status,
          userImage: imageUrl || member.userImage,
          hasCustomName: !!userName,
          hasCustomImage: !!imageUrl,
          isFirstLogin: false
        }
      });

      // Broadcast update to workspace members
      await pusherServer.trigger(
        `workspace-${member.workspaceId}`,
        'member:update',
        {
          id: member.id,
          userName: updatedMember.userName,
          userImage: updatedMember.userImage,
          status: updatedMember.status
        }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PROFILE_UPDATE_ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 