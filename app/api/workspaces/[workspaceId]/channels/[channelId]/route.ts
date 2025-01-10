import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';
import { EVENTS } from '@/lib/pusher-events';

export async function DELETE(
  req: Request,
  { params }: { params: { workspaceId: string; channelId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const channel = await prisma.channel.delete({
      where: {
        id: params.channelId,
        workspaceId: params.workspaceId
      }
    });

    // Trigger Pusher event for channel deletion
    await pusherServer.trigger(
      `workspace-${params.workspaceId}`,
      EVENTS.CHANNEL_DELETE,
      {
        id: channel.id,
        name: channel.name,
        workspaceId: channel.workspaceId
      }
    );

    return NextResponse.json(channel);
  } catch (error) {
    console.error('[CHANNELS_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 