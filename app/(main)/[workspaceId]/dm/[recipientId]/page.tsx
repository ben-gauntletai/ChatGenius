import { redirect } from 'next/navigation'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import DirectMessageList from '@/components/direct-messages/direct-message-list'
import DirectMessageHeader from '@/components/layout/main-content/direct-message-header'

export default async function DirectMessagePage({ params }: {
  params: { workspaceId: string; recipientId: string }
}) {
  const { userId } = auth()
  if (!userId) redirect('/sign-in')

  const otherUser = await prisma.workspaceMember.findFirst({
    where: { 
      userId: params.recipientId,
      workspaceId: params.workspaceId
    }
  })

  if (!otherUser) redirect(`/${params.workspaceId}`)

  const messages = await prisma.directMessage.findMany({
    where: {
      workspaceId: params.workspaceId,
      OR: [
        { senderId: userId, recipientId: params.recipientId },
        { senderId: params.recipientId, recipientId: userId }
      ]
    },
    orderBy: { createdAt: 'asc' },
    include: { reactions: true }
  })

  const formattedMessages = messages.map(message => ({
    id: message.id,
    content: message.content,
    createdAt: message.createdAt,
    userId: message.senderId,
    userName: message.senderName,
    userImage: message.senderImage,
    reactions: message.reactions,
    isEdited: message.updatedAt !== message.createdAt
  }))

  return (
    <div className="flex flex-col h-full">
      <DirectMessageHeader 
        userName={otherUser.userName}
        userImage={otherUser.userImage}
      />
      <DirectMessageList
        workspaceId={params.workspaceId}
        recipientId={params.recipientId}
        initialMessages={formattedMessages}
      />
    </div>
  )
}