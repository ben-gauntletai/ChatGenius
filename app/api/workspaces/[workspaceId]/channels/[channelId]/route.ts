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

    await prisma.channel.delete({
      where: {
        id: params.channelId,
        workspaceId: params.workspaceId
      }
    });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error('[CHANNEL_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 