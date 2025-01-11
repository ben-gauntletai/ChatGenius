'use client'

import { useState, useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import Message from './message'
import { useAuth } from '@clerk/nextjs'
import { pusherClient } from '@/lib/pusher'
import { Message as MessageType } from '@/types'
import { useWorkspaceMembers } from '@/contexts/workspace-members-context'

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
  const [replies, setReplies] = useState<MessageType[]>([])
  const [newReply, setNewReply] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [localParentMessage, setLocalParentMessage] = useState(parentMessage)
  const bottomRef = useRef<HTMLDivElement>(null)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    setLocalParentMessage(parentMessage)
  }, [parentMessage.id])

  // Fetch initial replies
  useEffect(() => {
    if (!parentMessage?.id || hasInitializedRef.current) return;

    const fetchReplies = async () => {
      try {
        const endpoint = `/api/messages/${parentMessage.id}/thread`
        const response = await fetch(endpoint)
        const data = await response.json()
        setReplies(data)
        hasInitializedRef.current = true;
      } catch (error) {
        console.error('Error fetching replies:', error)
      }
    }

    fetchReplies()
  }, [parentMessage.id]);

  // Handle reply count updates
  useEffect(() => {
    if (replies.length > 0) {
      onReplyCountChange?.(parentMessage.id, replies.length);
    }
  }, [replies.length, parentMessage.id, onReplyCountChange]);

  // Subscribe to channel events
  useEffect(() => {
    if (!channelId) return;

    const channel = pusherClient.subscribe(`channel-${channelId}`);
    
    // Handle new messages
    const handleMessage = (message: MessageType) => {
      console.log('Thread received message:', {
        message,
        isThreadReply: message.isThreadReply,
        parentMessageId: message.parentMessageId,
        thisThreadId: parentMessage.id
      });

      // If it's a thread reply for this thread
      if (message.isThreadReply && message.parentMessageId === parentMessage.id) {
        setReplies((current) => {
          if (current.some(r => r.id === message.id)) return current;
          return [...current, message].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        });

        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        });
      }
    };

    // Handle message updates (including reactions)
    const handleMessageUpdate = (message: MessageType) => {
      console.log('Thread received update:', {
        message,
        parentMessageId: parentMessage.id,
        currentReplies: replies
      });

      // If it's the parent message
      if (message.id === parentMessage.id) {
        console.log('Updating parent message with:', message);
        setLocalParentMessage(current => {
          const updated = {
            ...current,
            content: message.content !== undefined ? message.content : current.content,
            reactions: message.reactions !== undefined ? message.reactions : current.reactions,
            replyCount: message.replyCount !== undefined ? message.replyCount : current.replyCount,
            thread: message.thread || current.thread
          };
          console.log('Updated parent message:', updated);
          return updated;
        });

        // If there's a new reply in the update
        if (message.thread?.lastReply) {
          setReplies(current => {
            if (current.some(r => r.id === message.thread!.lastReply!.id)) return current;
            return [...current, message.thread!.lastReply!].sort((a, b) => 
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
          });

          requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          });
        }
      } else {
        // Update thread replies (including reactions)
        setReplies(current => {
          const updated = current.map(reply => {
            if (reply.id === message.id) {
              console.log('Updating reply:', reply.id, 'with:', message);
              return {
                ...reply,
                content: message.content !== undefined ? message.content : reply.content,
                reactions: message.reactions !== undefined ? message.reactions : reply.reactions
              };
            }
            return reply;
          });
          console.log('Updated replies:', updated);
          return updated;
        });
      }
    };

    // Handle message deletions
    const handleMessageDelete = (messageId: string) => {
      console.log('Thread received delete:', messageId);

      // If parent message is deleted, close the thread
      if (messageId === parentMessage.id) {
        onClose();
        return;
      }

      // Remove the message from replies
      setReplies(current => {
        const newReplies = current.filter(reply => reply.id !== messageId);
        // Update reply count after deletion
        if (newReplies.length !== current.length) {
          onReplyCountChange?.(parentMessage.id, newReplies.length);
        }
        return newReplies;
      });
    };

    channel.bind('new-message', handleMessage);
    channel.bind('message-update', handleMessageUpdate);
    channel.bind('message-delete', handleMessageDelete);

    return () => {
      channel.unbind('new-message', handleMessage);
      channel.unbind('message-update', handleMessageUpdate);
      channel.unbind('message-delete', handleMessageDelete);
      pusherClient.unsubscribe(`channel-${channelId}`);
    };
  }, [channelId, parentMessage.id, onClose, onReplyCountChange]);

  // Listen for profile updates
  useEffect(() => {
    if (!workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
    
    channel.bind('profile-update', (data: {
      userId: string;
      name: string;
      imageUrl: string | null;
      hasCustomName: boolean;
      hasCustomImage: boolean;
    }) => {
      // Update parent message if it's from the same user
      if (data.userId === localParentMessage.userId) {
        setLocalParentMessage(current => ({
          ...current,
          userName: data.hasCustomName ? data.name : 'User',
          userImage: data.hasCustomImage && data.imageUrl?.startsWith('/api/files/') ? data.imageUrl : null
        }));
      }

      // Update replies from the same user
      setReplies(current =>
        current.map(reply =>
          reply.userId === data.userId
            ? {
                ...reply,
                userName: data.hasCustomName ? data.name : 'User',
                userImage: data.hasCustomImage && data.imageUrl?.startsWith('/api/files/') ? data.imageUrl : null
              }
            : reply
        )
      );
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, localParentMessage.userId]);

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