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

  // Fetch messages with reactions
  const messages = await prisma.message.findMany({
    where: {
      channelId: params.channelId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    include: {
      reactions: true
    }
  })

  const formattedMessages = messages.map(message => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    userId: message.userId,
    userName: message.userName,
    userImage: message.userImage,
    channelId: message.channelId,
    reactions: message.reactions
  }))

  return (
    <div className="flex flex-col h-full">
      <ChannelHeader name={channel.name} />
      <MessageList 
        initialMessages={formattedMessages} 
        channelId={params.channelId} 
      />
    </div>
  )
} 