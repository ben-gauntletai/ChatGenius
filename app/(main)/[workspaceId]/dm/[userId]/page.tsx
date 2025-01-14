import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import DirectMessageContainer from '@/components/layout/main-content/direct-message-container';

export default async function DirectMessagePage({
  params
}: {
  params: { workspaceId: string; userId: string }
}) {
  const { userId: currentUserId } = auth();
  if (!currentUserId) redirect('/sign-in');

  // Fetch the other user's details
  const otherUser = await prisma.workspaceMember.findFirst({
    where: { 
      userId: params.userId,
      workspaceId: params.workspaceId
    }
  });

  if (!otherUser) {
    redirect(`/${params.workspaceId}`);
  }

  // Fetch direct messages between the two users
  const messages = await prisma.directMessage.findMany({
    where: {
      workspaceId: params.workspaceId,
      OR: [
        { senderId: currentUserId, receiverId: params.userId },
        { senderId: params.userId, receiverId: currentUserId }
      ]
    },
    orderBy: {
      createdAt: 'asc'
    },
    select: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      senderId: true,
      senderName: true,
      senderImage: true,
      reactions: true,
      fileUrl: true,
      fileName: true,
      fileType: true
    }
  });

  // Get all unique user IDs from messages
  const userIds = Array.from(new Set(messages.map(m => m.senderId)));

  // Get latest workspace member data for all users
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      userId: {
        in: userIds
      },
      workspaceId: params.workspaceId
    },
    select: {
      userId: true,
      userName: true,
      userImage: true
    }
  });

  // Create a map for quick lookup
  const memberMap = new Map(
    workspaceMembers.map(member => [member.userId, member])
  );

  const formattedMessages = messages.map(message => {
    const member = memberMap.get(message.senderId);
    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      userId: message.senderId,
      userName: member?.userName || 'User',
      userImage: member?.userImage?.startsWith('/api/files/') ? member.userImage : null,
      reactions: message.reactions,
      isEdited: message.updatedAt !== message.createdAt,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType
    };
  });

  return (
    <DirectMessageContainer
      otherUser={otherUser}
      initialMessages={formattedMessages}
      workspaceId={params.workspaceId}
    />
  );
}