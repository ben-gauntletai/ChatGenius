import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

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