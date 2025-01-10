import MessageList from '@/components/layout/main-content/message-list'
import ChannelHeader from '@/components/layout/main-content/channel-header'
import { prisma } from '@/lib/prisma'

interface ExtendedWorkspaceMember {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  role: string;
  status: string;
  lastManualStatus: string | null;
  hasCustomName: boolean;
  hasCustomImage: boolean;
  workspaceId: string;
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ChannelPage({
  params
}: {
  params: { workspaceId: string; channelId: string }
}) {
  // Fetch channel details with no-cache headers
  const channel = await prisma.channel.findUnique({
    where: {
      id: params.channelId,
    }
  });

  if (!channel) {
    return <div>Channel not found</div>;
  }

  // Fetch messages with reactions with no-cache headers
  const messages = await prisma.message.findMany({
    where: {
      channelId: params.channelId,
      threadId: null,
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

  // Get all workspace members in a single query
  const workspaceMembers = await prisma.workspaceMember.findMany({
    where: {
      userId: {
        in: messages.map(m => m.userId)
      },
      workspaceId: params.workspaceId
    }
  });

  // Create a map for quick lookup
  const memberMap = new Map(
    workspaceMembers.map(member => [member.userId, member as unknown as ExtendedWorkspaceMember])
  );

  // Update messages with latest profile info
  const formattedMessages = messages.map(message => {
    const member = memberMap.get(message.userId) as ExtendedWorkspaceMember | undefined;
    return {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
      userId: message.userId,
      userName: member?.hasCustomName ? member.userName : 'User',
      userImage: member?.hasCustomImage && member.userImage?.startsWith('/api/files/') ? member.userImage : null,
      channelId: message.channelId,
      reactions: message.reactions,
      fileUrl: message.fileUrl,
      fileName: message.fileName,
      fileType: message.fileType,
      replyCount: message.thread?.replies.length ?? 0
    };
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChannelHeader name={channel.name} />
      <div className="flex-1 overflow-y-auto">
        <MessageList 
          key={params.channelId}
          initialMessages={formattedMessages} 
          channelId={params.channelId}
          workspaceId={params.workspaceId}
        />
      </div>
    </div>
  );
} 