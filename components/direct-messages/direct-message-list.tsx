'use client'

import { useState, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Loader2 } from 'lucide-react'
import Message from '../layout/main-content/message'

interface DirectMessageListProps {
  workspaceId: string
  recipientId: string
  initialMessages: any[]
}

export default function DirectMessageList({
  workspaceId,
  recipientId,
  initialMessages
}: DirectMessageListProps) {
  const { user } = useUser()
  const [messages, setMessages] = useState(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/direct-messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage,
          recipientId,
          senderName: user.fullName || user.username || '',
          senderImage: user.imageUrl,
        }),
      })

      if (!response.ok) throw new Error('Failed to send message')
      setNewMessage('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <Message
            key={message.id}
            message={message}
            currentUserId={user?.id || ''}
            showActionButtons={message.userId === user?.id}
            workspaceId={workspaceId}
            isDM={true}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#3F0E40]"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newMessage.trim()}
            className="bg-[#3F0E40] text-white px-4 py-2 rounded-md hover:bg-[#4A154B] disabled:opacity-50 transition"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              'Send'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}