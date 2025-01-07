import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function DELETE(
  req: Request,
  { params }: { params: { workspaceId: string; channelId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if user is a member of the workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: params.workspaceId,
      },
    });

    if (!member) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Delete the channel and all associated messages
    await prisma.channel.delete({
      where: {
        id: params.channelId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CHANNEL_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 