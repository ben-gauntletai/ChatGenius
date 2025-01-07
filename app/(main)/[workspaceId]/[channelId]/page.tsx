import MessageList from '@/components/layout/main-content/message-list'
import ChannelHeader from '@/components/layout/main-content/channel-header'
import { prisma } from '@/lib/prisma'

export default async function ChannelPage({
  params
}: {
  params: { workspaceId: string; channelId: string }
}) {
  // Fetch channel details
  const channel = await prisma.channel.findUnique({
    where: {
      id: params.channelId,
    }
  });

  if (!channel) {
    return <div>Channel not found</div>;
  }

  // Fetch messages with reactions, explicitly excluding thread replies
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

  return (
    <div className="flex flex-col h-full">
      <ChannelHeader name={channel.name} />
      <MessageList 
        initialMessages={formattedMessages} 
        channelId={params.channelId}
        workspaceId={params.workspaceId}
      />
    </div>
  );
} 