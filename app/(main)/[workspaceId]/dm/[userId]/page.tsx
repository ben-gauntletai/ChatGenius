import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import MessageList from '@/components/layout/main-content/message-list';
import DirectMessageHeader from '@/components/layout/main-content/direct-message-header';

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

  const formattedMessages = messages.map(message => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    userId: message.senderId,
    userName: message.senderName,
    userImage: message.senderImage,
    reactions: message.reactions,
    isEdited: message.updatedAt !== message.createdAt,
    fileUrl: message.fileUrl,
    fileName: message.fileName,
    fileType: message.fileType
  }));

  return (
    <div className="flex flex-col h-full">
      <DirectMessageHeader 
        userName={otherUser.userName}
        userImage={otherUser.userImage}
      />
      <MessageList 
        initialMessages={formattedMessages}
        isDM={true}
        otherUserId={params.userId}
        workspaceId={params.workspaceId}
      />
    </div>
  );
}