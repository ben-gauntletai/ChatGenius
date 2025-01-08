import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function updateUserStatusOnSignOut(userId: string) {
  // Find all workspaces the user is a member of
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      userId: userId
    }
  });

  // Update each membership and notify via Pusher
  await Promise.all(workspaceMembers.map(async (member) => {
    // Update status to OFFLINE
    await prisma.workspaceMember.update({
      where: {
        id: member.id
      },
      data: {
        status: 'OFFLINE',
        lastManualStatus: 'OFFLINE'
      }
    });

    // Notify via Pusher
    await pusherServer.trigger(
      `workspace-${member.workspaceId}`,
      'member-status-update',
      { userId, status: 'OFFLINE' }
    );
  }));
} 