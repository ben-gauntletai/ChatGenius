'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import Message from './message'
import { useAuth } from '@clerk/nextjs'
import { Message as MessageType } from '@/types'
import { useWorkspaceMembers } from '@/contexts/workspace-members-context'
import { useMessages } from '@/contexts/message-context'

interface ThreadProps {
  isOpen: boolean;
  onClose: () => void;
  parentMessage: MessageType;
  channelId?: string;
  workspaceId?: string;
  onReplyCountChange?: (messageId: string, newCount: number) => void;
}

export default function Thread({
  isOpen,
  onClose,
  parentMessage,
  channelId,
  workspaceId,
  onReplyCountChange
}: ThreadProps) {
  const { userId } = useAuth()
  const { members } = useWorkspaceMembers()
  const { getThreadMessages, addMessage, deleteMessage: contextDeleteMessage } = useMessages()
  const [newReply, setNewReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Get thread messages
  const threadMessages = getThreadMessages(parentMessage.id)
  const replies = threadMessages.filter(msg => msg.id !== parentMessage.id)

  // Fetch initial replies
  useEffect(() => {
    const fetchReplies = async () => {
      try {
        const response = await fetch(`/api/messages/${parentMessage.id}/thread`)
        if (!response.ok) throw new Error('Failed to fetch replies')
        const data = await response.json()
        data.forEach(addMessage)
      } catch (error) {
        console.error('Error fetching replies:', error)
      }
    }

    fetchReplies()
  }, [parentMessage.id])

  // Handle reply count updates
  useEffect(() => {
    if (replies.length > 0) {
      onReplyCountChange?.(parentMessage.id, replies.length)
    }
  }, [replies.length, parentMessage.id, onReplyCountChange])

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete message')
      
      contextDeleteMessage(messageId)
      if (messageId === parentMessage.id) {
        onClose()
      }
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleEdit = async (messageId: string, newContent: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      })

      if (!response.ok) throw new Error('Failed to edit message')
    } catch (error) {
      console.error('Error editing message:', error)
    }
  }

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })

      if (!response.ok) throw new Error('Failed to add reaction')
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleRemoveReaction = async (messageId: string, reactionId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions/${reactionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to remove reaction')
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newReply.trim() || isLoading) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/messages/${parentMessage.id}/thread`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newReply,
          channelId,
          workspaceId,
          isDM: !!parentMessage.conversationId
        })
      })

      if (!response.ok) throw new Error('Failed to send reply')
      
      // Add the new message to the context
      const newMessage = await response.json()
      addMessage(newMessage)
      
      setNewReply('')
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="w-[400px] flex flex-col border-l h-full bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold">Thread</h3>
        <button onClick={onClose}>
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Message 
          {...parentMessage}
          onDelete={handleDelete}
          onEdit={handleEdit}
          onReact={handleReact}
          onRemoveReaction={handleRemoveReaction}
          isThreadReply={false}
        />
        
        <div className="ml-8 mt-4 space-y-4 border-l pl-4">
          {replies.map((reply) => (
            <Message
              key={reply.id}
              {...reply}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
              isThreadReply={true}
            />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          type="text"
          value={newReply}
          onChange={(e) => setNewReply(e.target.value)}
          placeholder="Reply in thread..."
          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
      </form>
    </div>
  )
} 