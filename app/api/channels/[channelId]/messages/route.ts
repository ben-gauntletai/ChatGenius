import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/utils/pusher';

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId: params.channelId,
        threadId: null, // Only fetch top-level messages
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        reactions: true,
        thread: {
          include: {
            replies: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      userId: message.userId,
      userName: message.userName,
      userImage: message.userImage,
      channelId: message.channelId,
      reactions: message.reactions,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      replyCount: message.thread?.replies.length ?? 0
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('[CHANNEL_MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { userId } = auth();
    const user = await currentUser();
    const { content, workspaceId, url, name, type } = await req.json();

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        fileUrl: url || null,
        fileName: name || null,
        fileType: type || null,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        channelId: params.channelId,
        workspaceId
      },
      include: {
        reactions: true
      }
    });

    await pusherServer.trigger(
      `channel-${params.channelId}`,
      'new-message',
      message
    );

    return NextResponse.json(message);
  } catch (error) {
    console.error('[MESSAGES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 