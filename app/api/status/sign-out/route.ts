import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { userId: currentUserId } = auth();
    const { userId } = await req.json();
    
    console.log('Sign out request received for user:', userId);

    // Security check
    if (!currentUserId || currentUserId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Find all workspaces the user is a member of
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        userId
      },
      select: {
        id: true,
        workspaceId: true
      }
    });

    // Update all memberships in a single transaction
    await prisma.$transaction([
      // Update all workspace members to OFFLINE
      prisma.workspaceMember.updateMany({
        where: {
          userId
        },
        data: {
          status: 'OFFLINE'
        }
      }),
      // Send Pusher notifications
      ...workspaceMembers.map(member => 
        pusherServer.trigger(
          `workspace-${member.workspaceId}`,
          'member-status-update',
          { userId, status: 'OFFLINE' }
        )
      )
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SIGN_OUT_STATUS]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 