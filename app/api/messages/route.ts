import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'
import { storeMessagesAsVectors } from '@/lib/vector-store'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { content, channelId, workspaceId, fileUrl, fileName, fileType } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('Creating message with:', { content, channelId, workspaceId, fileUrl, fileName, fileType }) // Debug log

    // Get the workspace member's current profile information
    const workspaceMember = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId
      },
      select: {
        userName: true,
        userImage: true
      }
    });

    if (!workspaceMember) {
      return new NextResponse('User not found in workspace', { status: 404 })
    }

    console.log('Found workspace member for message:', workspaceMember); // Debug log

    // Ensure we have the correct profile information
    const messageData: any = {
      content,
      fileUrl,
      fileName,
      fileType,
      userId,
      userName: workspaceMember.userName || 'User',
      channel: {
        connect: {
          id: channelId
        }
      },
      workspace: {
        connect: {
          id: workspaceId
        }
      }
    };

    if (workspaceMember.userImage?.startsWith('/api/files/')) {
      messageData.userImage = workspaceMember.userImage;
    }

    const message = await prisma.message.create({
      data: messageData,
      include: {
        reactions: true
      }
    });

    // Trigger Pusher event with the message immediately
    await pusherServer.trigger(`channel-${channelId}`, 'new-message', message);

    // Vectorize the message asynchronously
    (async () => {
      try {
        await storeMessagesAsVectors([message]);
        console.log('[MESSAGES_POST] Message vectorized:', message.id);
      } catch (error) {
        console.error('[MESSAGES_POST] Failed to vectorize message:', error);
      }
    })().catch(error => {
      console.error('[MESSAGES_POST] Async vectorization error:', error);
    });

    console.log('Created message:', message); // Debug log

    return NextResponse.json(message);
  } catch (error) {
    console.error('[MESSAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return new NextResponse('Channel ID missing', { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        userName: true,
        userImage: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        reactions: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log('Retrieved messages with file data:', messages) // Debug log

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[MESSAGES_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 