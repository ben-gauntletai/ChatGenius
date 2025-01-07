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
  workspaceId
}: { 
  initialMessages: Message[]
  channelId?: string
  workspaceId?: string
}) {
  const { userId } = useAuth()
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Subscribe to Pusher channel when component mounts or channelId changes
  useEffect(() => {
    if (!channelId) return

    // Subscribe to the channel
    const channelName = `channel-${channelId}`
    const channel = pusherClient.subscribe(channelName)

    // Handle new messages
    const handleNewMessage = (message: Message) => {
      setMessages((current) => [...current, message])
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    // Bind to the new-message event
    channel.bind('new-message', handleNewMessage)

    // Cleanup on unmount or when channelId changes
    return () => {
      channel.unbind('new-message', handleNewMessage)
      pusherClient.unsubscribe(channelName)
    }
  }, [channelId])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      const endpoint = `/api/messages`
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          channelId: channelId
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
      const response = await fetch(`/api/messages/${messageId}`, {
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
      const response = await fetch(`/api/messages/${messageId}`, {
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
      const endpoint = `/api/messages/${messageId}/reactions`
      
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
      const endpoint = `/api/messages/${messageId}/reactions/${reactionId}`;
      
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