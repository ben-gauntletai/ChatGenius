import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { EVENTS } from '@/lib/pusher-events';
import type { WorkspaceMember } from '@prisma/client';

// Temporary type to help TypeScript recognize the autoResponseEnabled field
type ExtendedWorkspaceMember = WorkspaceMember & {
  autoResponseEnabled: boolean;
};

export async function PATCH(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { userName, status, userImage, autoResponseEnabled } = await req.json();
    console.log('Received update request:', { userName, status, userImage, autoResponseEnabled });

    // Find all workspace memberships for the user
    const members = (await prisma.workspaceMember.findMany({
      where: { userId }
    })) as ExtendedWorkspaceMember[];
    
    console.log('Current member state:', members.map(m => ({ 
      id: m.id, 
      autoResponseEnabled: m.autoResponseEnabled 
    })));

    // Update all memberships
    const updatePromises = members.map(async (member: ExtendedWorkspaceMember) => {
      // Only update the fields that are provided
      const updateData: any = {
        isFirstLogin: false // Always set isFirstLogin to false on profile update
      };
      
      if (status !== undefined) {
        updateData.status = status;
      }
      
      if (userName !== undefined) {
        updateData.userName = userName || 'User';
        updateData.hasCustomName = !!userName;
      }
      
      if (userImage !== undefined) {
        updateData.userImage = userImage || member.userImage;
        updateData.hasCustomImage = !!userImage;
      }

      if (autoResponseEnabled !== undefined) {
        updateData.autoResponseEnabled = autoResponseEnabled;
        console.log('Updating autoResponseEnabled for member', member.id, 'to:', autoResponseEnabled);
      }

      const updatedMember = (await prisma.workspaceMember.update({
        where: { id: member.id },
        data: updateData
      })) as ExtendedWorkspaceMember;

      console.log('Member updated:', { 
        id: updatedMember.id, 
        autoResponseEnabled: updatedMember.autoResponseEnabled 
      });

      // Broadcast update to workspace members
      await pusherServer.trigger(
        `workspace-${member.workspaceId}`,
        EVENTS.MEMBER_UPDATE,
        {
          id: updatedMember.id,
          userId: updatedMember.userId,
          userName: updatedMember.userName,
          userImage: updatedMember.userImage,
          status: updatedMember.status,
          hasCustomName: updatedMember.hasCustomName,
          hasCustomImage: updatedMember.hasCustomImage,
          workspaceId: updatedMember.workspaceId,
          autoResponseEnabled: updatedMember.autoResponseEnabled
        }
      );

      return updatedMember;
    });

    const updatedMembers = await Promise.all(updatePromises);
    console.log('All members updated:', updatedMembers.map(m => ({ 
      id: m.id, 
      autoResponseEnabled: m.autoResponseEnabled 
    })));

    return NextResponse.json(updatedMembers[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 