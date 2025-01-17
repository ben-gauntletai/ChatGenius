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

    const { 
      userName, 
      status, 
      userImage, 
      autoResponseEnabled,
      voiceResponseEnabled,
      selectedVoiceId
    } = await req.json();

    // Find all workspace memberships for the user
    const members = await prisma.workspaceMember.findMany({
      where: { userId }
    });

    // Update all workspace memberships
    const updatePromises = members.map(member => 
      prisma.workspaceMember.update({
        where: { id: member.id },
        data: {
          userName: userName || member.userName,
          userImage: userImage || member.userImage,
          hasCustomName: Boolean(userName),
          hasCustomImage: Boolean(userImage),
          status: status || member.status,
          autoResponseEnabled: autoResponseEnabled ?? member.autoResponseEnabled,
          voiceResponseEnabled: voiceResponseEnabled ?? member.voiceResponseEnabled,
          selectedVoiceId: selectedVoiceId ?? member.selectedVoiceId,
          isFirstLogin: false
        }
      })
    );

    const updatedMembers = await Promise.all(updatePromises);

    // Notify all channels in each workspace about the member update
    for (const member of updatedMembers) {
      await pusherServer.trigger(
        `workspace-${member.workspaceId}`,
        EVENTS.MEMBER_UPDATE,
        {
          memberId: member.id,
          updates: {
            userName: member.userName,
            userImage: member.userImage,
            status: member.status,
            hasCustomName: member.hasCustomName,
            hasCustomImage: member.hasCustomImage,
            autoResponseEnabled: member.autoResponseEnabled,
            voiceResponseEnabled: member.voiceResponseEnabled,
            selectedVoiceId: member.selectedVoiceId
          }
        }
      );
    }

    return NextResponse.json(updatedMembers[0]);
  } catch (error) {
    console.error('[PROFILE_UPDATE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 