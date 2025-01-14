import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'
import type { WorkspaceMember } from '@prisma/client'

// Temporary type to help TypeScript recognize the autoResponseEnabled field
type ExtendedWorkspaceMember = WorkspaceMember & {
  autoResponseEnabled: boolean;
};

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    
    if (!userId || !user) {
      console.error('[DIRECT_MESSAGES_POST] Auth failed:', { userId, user });
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const body = await req.json()
    console.log('[DIRECT_MESSAGES_POST] Request body:', body);
    
    const { content, workspaceId, receiverId, fileUrl, fileName, fileType } = body
    
    if (!workspaceId || !receiverId) {
      console.error('[DIRECT_MESSAGES_POST] Missing required fields:', { workspaceId, receiverId });
      return new NextResponse('Missing required fields', { status: 400 })
    }

    console.log('[DIRECT_MESSAGES_POST] Looking up members:', { userId, workspaceId, receiverId });

    // Get both sender and receiver workspace member data
    const [sender, receiver] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { userId, workspaceId },
        select: {
          userName: true,
          userImage: true
        }
      }),
      prisma.workspaceMember.findFirst({
        where: { userId: receiverId, workspaceId },
        select: {
          userName: true,
          userImage: true
        }
      })
    ]);

    console.log('[DIRECT_MESSAGES_POST] Found members:', { sender, receiver });

    if (!receiver) {
      console.error('[DIRECT_MESSAGES_POST] Receiver not found:', { receiverId, workspaceId });
      return new NextResponse('Receiver not found', { status: 404 })
    }

    if (!sender) {
      console.error('[DIRECT_MESSAGES_POST] Sender not found:', { userId, workspaceId });
      return new NextResponse('Sender not found', { status: 404 })
    }

    console.log('[DIRECT_MESSAGES_POST] Creating message');

    // Create message immediately
    const message = await prisma.directMessage.create({
      data: {
        content,
        fileUrl,
        fileName,
        fileType,
        workspaceId,
        senderId: userId,
        senderName: sender.userName || 'User',
        senderImage: sender.userImage?.startsWith('/api/files/') ? sender.userImage : null,
        receiverId,
        receiverName: receiver.userName || 'User',
        receiverImage: receiver.userImage?.startsWith('/api/files/') ? receiver.userImage : null,
      },
      include: {
        reactions: true
      }
    });

    // Format and send the original message immediately
    const formattedMessage = {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      userId: message.senderId,
      userName: message.senderName,
      userImage: message.senderImage,
      reactions: message.reactions,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      isEdited: false
    }

    // Create channel name for Pusher
    const channelName = `dm-${[userId, receiverId].sort().join('-')}`;
    await pusherServer.trigger(channelName, 'new-message', formattedMessage);

    // Check if receiver has auto-response enabled and handle asynchronously
    const receiverMember = (await prisma.workspaceMember.findFirst({
      where: { 
        userId: receiverId,
        workspaceId 
      }
    })) as ExtendedWorkspaceMember | null;

    if (receiverMember?.autoResponseEnabled) {
      // Handle auto-response asynchronously
      (async () => {
        try {
          console.log('[DIRECT_MESSAGES_POST] Auto-response is enabled for receiver');
          
          // Use NEXT_PUBLIC_APP_URL for the base URL
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          console.log('[DIRECT_MESSAGES_POST] Making auto-response request to:', `${baseUrl}/api/generate-response`);

          // Generate auto-response
          const autoResponse = await fetch(`${baseUrl}/api/generate-response`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: content,
              userId: receiverId,
              workspaceId
            })
          });
          
          console.log('[DIRECT_MESSAGES_POST] Auto-response status:', autoResponse.status);
          
          if (!autoResponse.ok) {
            const errorText = await autoResponse.text();
            console.error('[DIRECT_MESSAGES_POST] Auto-response failed:', {
              status: autoResponse.status,
              statusText: autoResponse.statusText,
              error: errorText
            });
            return;
          }

          const { response } = await autoResponse.json();
          console.log('[DIRECT_MESSAGES_POST] Got auto-response:', response);
          
          // Create auto-response message
          const autoResponseMessage = await prisma.directMessage.create({
            data: {
              content: response,
              workspaceId,
              senderId: receiverId,
              senderName: receiver.userName || 'User',
              senderImage: receiver.userImage?.startsWith('/api/files/') ? receiver.userImage : null,
              receiverId: userId,
              receiverName: sender.userName || 'User',
              receiverImage: sender.userImage?.startsWith('/api/files/') ? sender.userImage : null,
            },
            include: {
              reactions: true
            }
          });

          // Format and broadcast auto-response
          const formattedAutoResponse = {
            id: autoResponseMessage.id,
            content: autoResponseMessage.content,
            createdAt: autoResponseMessage.createdAt,
            userId: autoResponseMessage.senderId,
            userName: autoResponseMessage.senderName,
            userImage: autoResponseMessage.senderImage,
            reactions: autoResponseMessage.reactions,
            fileUrl: null,
            fileName: null,
            fileType: null,
            isEdited: false
          };

          // Use the same channel name convention
          const autoResponseChannelName = `dm-${[receiverId, userId].sort().join('-')}`;
          await pusherServer.trigger(autoResponseChannelName, 'new-message', formattedAutoResponse);
        } catch (error) {
          console.error('[DIRECT_MESSAGES_POST] Auto-response error:', error);
        }
      })().catch(error => {
        console.error('[DIRECT_MESSAGES_POST] Async auto-response error:', error);
      });
    }

    return NextResponse.json(formattedMessage);
  } catch (error) {
    console.error('[DIRECT_MESSAGES_POST] Detailed error:', error)
    // Return the actual error message in development
    return new NextResponse(error instanceof Error ? error.message : 'Internal Error', { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth();
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const otherUserId = searchParams.get('otherUserId');

    if (!userId || !workspaceId || !otherUserId) {
      return new NextResponse('Missing required parameters', { status: 400 });
    }

    // Fetch direct messages between the two users
    const messages = await prisma.directMessage.findMany({
      where: {
        workspaceId,
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      orderBy: {
        createdAt: 'asc'
      },
      include: {
        reactions: true
      }
    });

    // Format messages to match the expected structure
    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      userId: message.senderId,
      userName: message.senderName || 'User',
      userImage: message.senderImage || null,
      reactions: message.reactions || [],
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      isEdited: message.updatedAt !== message.createdAt,
      senderId: message.senderId,
      senderName: message.senderName || 'User',
      senderImage: message.senderImage || null,
      receiverId: message.receiverId,
      receiverName: message.receiverName || 'User',
      receiverImage: message.receiverImage || null
    }));

    return NextResponse.json(formattedMessages);
  } catch (error) {
    console.error('[DIRECT_MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 