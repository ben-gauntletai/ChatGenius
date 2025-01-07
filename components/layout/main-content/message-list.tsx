'use client'

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { pusherClient } from '@/lib/pusher'
import Message from './message'

interface Message {
  id: string
  content: string
  createdAt: Date
  userId: string
  userName: string
  userImage: string
  channelId?: string
  reactions: any[]
}

export default function MessageList({ 
  initialMessages = [],
  channelId,
  isDM = false,
  otherUserId
}: { 
  initialMessages: Message[]
  channelId?: string
  isDM?: boolean
  otherUserId?: string
}) {
  const { userId } = useAuth()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasInitializedRef = useRef(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const endpoint = isDM ? '/api/direct-messages' : `/api/messages`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          channelId: channelId,
          receiverId: otherUserId
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      const endpoint = isDM ? `/api/direct-messages/${messageId}` : `/api/messages/${messageId}`
      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      setMessages((current) => 
        current.filter((message) => message.id !== messageId)
      )
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  }

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      const endpoint = isDM ? `/api/direct-messages/${messageId}` : `/api/messages/${messageId}`
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: newContent }),
      })

      if (!response.ok) {
        throw new Error('Failed to edit message')
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, content: newContent }
            : message
        )
      )
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const endpoint = isDM 
        ? `/api/direct-messages/${messageId}/reactions`
        : `/api/messages/${messageId}/reactions`
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emoji }),
      })

      if (!response.ok) {
        throw new Error('Failed to add reaction')
      }

      const updatedMessage = await response.json()
      
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, reactions: updatedMessage.reactions }
            : message
        )
      )
    } catch (error) {
      console.error('Failed to add reaction:', error)
    }
  }

  const handleRemoveReaction = async (messageId: string, reactionId: string) => {
    try {
      const endpoint = isDM 
        ? `/api/direct-messages/${messageId}/reactions/${reactionId}`
        : `/api/messages/${messageId}/reactions/${reactionId}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to remove reaction');
      }

      const updatedMessage = await response.json();
      
      setMessages((current) =>
        current.map((message) =>
          message.id === messageId
            ? { ...message, reactions: updatedMessage.reactions }
            : message
        )
      );
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  useEffect(() => {
    setMessages(initialMessages)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    
    if (!channelId && !isDM) return

    if (hasInitializedRef.current) return
    hasInitializedRef.current = true

    const channelName = isDM 
      ? `dm-${[userId, otherUserId].sort().join('-')}` 
      : `channel-${channelId}`
    
    const channel = pusherClient.subscribe(channelName)
    
    channel.bind('new-message', (newMessage: Message) => {
      setMessages((current) => {
        if (current.some(msg => msg.id === newMessage.id)) {
          return current
        }
        return [...current, newMessage]
      })
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    return () => {
      hasInitializedRef.current = false
      pusherClient.unsubscribe(channelName)
    }
  }, [channelId, isDM, otherUserId, userId, initialMessages])

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 flex flex-col justify-end">
        <div className="overflow-y-auto">
          {messages.map((message) => (
            <Message
              key={message.id}
              id={message.id}
              content={message.content}
              userName={message.userName}
              userImage={message.userImage}
              createdAt={message.createdAt}
              userId={message.userId}
              channelId={channelId!}
              reactions={message.reactions}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReact={handleReact}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[#3F0E40]"
        />
      </form>
    </div>
  )
} 