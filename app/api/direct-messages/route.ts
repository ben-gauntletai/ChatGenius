import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    const user = await currentUser();

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { content, receiverId } = await req.json();

    // Get receiver details
    const receiver = await prisma.workspaceMember.findFirst({
      where: { userId: receiverId }
    });

    if (!receiver) {
      return new NextResponse('Receiver not found', { status: 404 });
    }

    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: userId,
        senderName: `${user.firstName} ${user.lastName}`,
        senderImage: user.imageUrl,
        receiverId: receiverId,
        receiverName: receiver.userName,
        receiverImage: receiver.userImage,
      },
      include: {
        reactions: true
      }
    });

    // Trigger Pusher event for real-time updates
    const channelName = `dm-${[userId, receiverId].sort().join('-')}`;
    await pusherServer.trigger(channelName, 'new-message', message);

    return NextResponse.json(message);
  } catch (error) {
    console.error('[DIRECT_MESSAGES_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}