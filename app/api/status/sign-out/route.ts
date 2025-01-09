import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { userId: currentUserId } = auth();
    const { userId } = await req.json();
    
    if (!currentUserId || currentUserId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // First update all memberships
    await prisma.workspaceMember.updateMany({
      where: { userId },
      data: { status: 'OFFLINE' }
    });

    // Then get workspaces and send notifications
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true }
    });

    await Promise.all(
      workspaceMembers.map(member => 
        pusherServer.trigger(
          `workspace-${member.workspaceId}`,
          'member-status-update',
          { userId, status: 'OFFLINE' }
        )
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SIGN_OUT_STATUS]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 