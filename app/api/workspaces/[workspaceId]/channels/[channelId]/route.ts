import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

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

    // Revalidate the workspace page and channel list
    revalidatePath(`/${params.workspaceId}`);
    revalidatePath(`/api/workspaces/${params.workspaceId}/channels`);

    return NextResponse.json(channel);
  } catch (error) {
    console.error('[CHANNEL_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 