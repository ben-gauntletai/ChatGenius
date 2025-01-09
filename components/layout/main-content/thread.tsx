'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import Message from './message'
import { useAuth } from '@clerk/nextjs'
import { pusherClient } from '@/lib/pusher'
import { Message as MessageType } from '@/types'

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
  const [replies, setReplies] = useState<MessageType[]>([])
  const [newReply, setNewReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localParentMessage, setLocalParentMessage] = useState(parentMessage)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [hasLoadedReplies, setHasLoadedReplies] = useState(false)

  useEffect(() => {
    setLocalParentMessage(parentMessage)
  }, [parentMessage.id])

  useEffect(() => {
    if (!parentMessage?.id || hasLoadedReplies) return

    const fetchReplies = async () => {
      try {
        const endpoint = `/api/messages/${parentMessage.id}/thread`
        const response = await fetch(endpoint)
        const data = await response.json()
        setReplies(data)
        setHasLoadedReplies(true)
        onReplyCountChange?.(parentMessage.id, data.length)
      } catch (error) {
        console.error('Error fetching replies:', error)
      }
    }

    fetchReplies()

    const channel = pusherClient.subscribe(`thread-${parentMessage.id}`)
    
    channel.bind('new-reply', (reply: any) => {
      setReplies((current) => {
        if (current.some(r => r.id === reply.id)) return current
        const newReplies = [...current, reply]
        onReplyCountChange?.(parentMessage.id, newReplies.length)
        return newReplies
      })
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    })

    return () => {
      pusherClient.unsubscribe(`thread-${parentMessage.id}`)
    }
  }, [parentMessage.id, hasLoadedReplies])

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
      
      const reply = await response.json()
      
      setReplies((current) => {
        if (current.some(r => r.id === reply.id)) {
          return current
        }
        const newReplies = [...current, reply]
        // Update reply count in parent
        onReplyCountChange?.(parentMessage.id, newReplies.length)
        return newReplies
      })
      
      setNewReply('')
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    } catch (error) {
      console.error('Error sending reply:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReplyDelete = async (messageId: string) => {
    try {
      const endpoint = parentMessage.conversationId 
        ? `/api/direct-messages/${messageId}`
        : `/api/messages/${messageId}`
        
      const response = await fetch(endpoint, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to delete reply')
      
      setReplies(current => {
        const newReplies = current.filter(reply => reply.id !== messageId)
        onReplyCountChange?.(parentMessage.id, newReplies.length)
        return newReplies
      })
    } catch (error) {
      console.error('Error deleting reply:', error)
    }
  }

  const handleReplyEdit = async (messageId: string, newContent: string) => {
    try {
      const endpoint = parentMessage.conversationId 
        ? `/api/direct-messages/${messageId}`
        : `/api/messages/${messageId}`
        
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      })
      
      if (!response.ok) throw new Error('Failed to edit reply')
      
      const updatedReply = await response.json()
      setReplies(current =>
        current.map(reply =>
          reply.id === messageId ? updatedReply : reply
        )
      )
    } catch (error) {
      console.error('Error editing reply:', error)
    }
  }

  const handleReplyReact = async (messageId: string, emoji: string) => {
    try {
      const endpoint = parentMessage.conversationId 
        ? `/api/direct-messages/${messageId}/reactions`
        : `/api/messages/${messageId}/reactions`
        
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })
      
      if (!response.ok) throw new Error('Failed to add reaction')
      
      const updatedReply = await response.json()
      setReplies(current =>
        current.map(reply =>
          reply.id === messageId
            ? { ...reply, reactions: updatedReply.reactions }
            : reply
        )
      )
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
      
      const updatedReply = await response.json()
      setReplies(current =>
        current.map(reply =>
          reply.id === messageId
            ? { ...reply, reactions: updatedReply.reactions }
            : reply
        )
      )
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  const handleParentReact = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      })
      
      if (!response.ok) throw new Error('Failed to add reaction')
      
      const updatedMessage = await response.json()
      setLocalParentMessage((current: MessageType) => ({
        ...current,
        reactions: updatedMessage.reactions
      }))
    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const handleParentRemoveReaction = async (messageId: string, reactionId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions/${reactionId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to remove reaction')
      
      const updatedMessage = await response.json()
      setLocalParentMessage((current: MessageType) => ({
        ...current,
        reactions: updatedMessage.reactions
      }))
    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  const handleParentDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      onClose()
    } catch (error) {
      console.error('Error deleting message:', error)
    }
  }

  const handleParentEdit = async (messageId: string, content: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content })
      })

      if (!response.ok) {
        throw new Error('Failed to edit message')
      }

      const updatedMessage = await response.json()
      setLocalParentMessage((current: MessageType) => ({
        ...current,
        content: updatedMessage.content,
        isEdited: true
      }))
    } catch (error) {
      console.error('Error editing message:', error)
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
          {...localParentMessage}
          onReact={handleParentReact}
          onRemoveReaction={handleParentRemoveReaction}
          onDelete={handleParentDelete}
          onEdit={handleParentEdit}
        />
        
        <div className="ml-8 mt-4 space-y-4 border-l pl-4">
          {replies.map((reply) => (
            <Message
              key={reply.id}
              {...reply}
              isThreadReply={true}
              onDelete={handleReplyDelete}
              onEdit={handleReplyEdit}
              onReact={handleReplyReact}
              onRemoveReaction={handleRemoveReaction}
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