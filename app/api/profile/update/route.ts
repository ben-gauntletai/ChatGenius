import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { EVENTS } from '@/lib/pusher-events';

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { userName, status, userImage } = await req.json();

    // Find all workspace memberships for the user
    const members = await prisma.workspaceMember.findMany({
      where: { userId }
    });

    // Update all memberships
    const updatePromises = members.map(async (member) => {
      const updatedMember = await prisma.workspaceMember.update({
        where: { id: member.id },
        data: {
          userName: userName || 'User',
          status: status || member.status,
          userImage: userImage || member.userImage,
          hasCustomName: !!userName,
          hasCustomImage: !!userImage
        }
      });

      // Broadcast update to workspace members
      await pusherServer.trigger(
        `workspace-${member.workspaceId}`,
        EVENTS.MEMBER_UPDATE,
        {
          ...updatedMember,
          workspaceId: member.workspaceId
        }
      );

      return updatedMember;
    });

    const updatedMembers = await Promise.all(updatePromises);
    return NextResponse.json(updatedMembers[0]);
  } catch (error) {
    console.error('PROFILE_UPDATE_ERROR:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 