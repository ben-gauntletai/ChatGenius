import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import MessageList from '@/components/layout/main-content/message-list';
import DirectMessageHeader from '@/components/layout/main-content/direct-message-header';

export default async function DirectMessagePage({
  params
}: {
  params: { userId: string }
}) {
  const { userId: currentUserId } = auth();
  if (!currentUserId) redirect('/sign-in');

  // Fetch the other user's details
  const otherUser = await prisma.workspaceMember.findFirst({
    where: { userId: params.userId }
  });

  if (!otherUser) {
    redirect('/');
  }

  // Fetch DM history
  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: params.userId },
        { senderId: params.userId, receiverId: currentUserId }
      ]
    },
    orderBy: {
      createdAt: 'asc'
    },
    include: {
      reactions: true
    }
  });

  // Transform messages to match the MessageList component's expectations
  const formattedMessages = messages.map(message => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    userId: message.senderId,
    userName: message.senderName,
    userImage: message.senderImage,
    reactions: message.reactions
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
      />
    </div>
  );
} 