'use client'

import MessageList from './message-list'
import ChannelHeader from './channel-header'
import { Message } from '@/types'

interface ChannelContentProps {
  name: string
  initialMessages: Message[]
  channelId: string
  workspaceId: string
}

export default function ChannelContent({ 
  name,
  initialMessages,
  channelId,
  workspaceId
}: ChannelContentProps) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChannelHeader name={name} />
      <div className="flex-1 overflow-y-auto">
        <MessageList 
          key={channelId}
          initialMessages={initialMessages} 
          channelId={channelId}
          workspaceId={workspaceId}
        />
      </div>
    </div>
  )
} 