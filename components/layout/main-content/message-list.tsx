'use client'

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { pusherClient } from '@/lib/pusher'
import Message from './message'
import { PaperclipIcon, X } from 'lucide-react'

interface Message {
  id: string
  content: string
  createdAt: Date
  userId: string
  userName: string
  userImage: string
  channelId?: string
  reactions: any[]
  fileUrl?: string
  fileName?: string
  fileType?: string
}

export default function MessageList({ 
  initialMessages = [],
  channelId,
  workspaceId,
  isDM = false,
  otherUserId
}: { 
  initialMessages: Message[]
  channelId?: string
  workspaceId?: string
  isDM?: boolean
  otherUserId?: string
}) {
  const { userId } = useAuth()
  const [messages, setMessages] = useState(initialMessages)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [newMessage, setNewMessage] = useState('')
  const [processedMessageIds] = useState(new Set(initialMessages.map(m => m.id)))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  console.log('Current selectedFile:', selectedFile) // Debug log

  useEffect(() => {
    if (!userId || !workspaceId) return

    const channelName = isDM 
      ? `dm-${[userId, otherUserId].sort().join('-')}`
      : `channel-${channelId}`

    const channel = pusherClient.subscribe(channelName)

    // Handle new messages
    channel.bind('new-message', (message: Message) => {
      if (!processedMessageIds.has(message.id)) {
        processedMessageIds.add(message.id)
        setMessages((current) => [...current, message])
      }
    })

    // Handle message updates (including reactions)
    channel.bind('message-updated', (updatedMessage: Message) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === updatedMessage.id ? updatedMessage : message
        )
      )
    })

    // Clean up
    return () => {
      pusherClient.unsubscribe(channelName)
      channel.unbind('new-message')
      channel.unbind('message-updated')
    }
  }, [channelId, isDM, otherUserId, userId, workspaceId, processedMessageIds])

  // Reset processed messages when switching channels/DMs
  useEffect(() => {
    processedMessageIds.clear()
    initialMessages.forEach(m => processedMessageIds.add(m.id))
    setMessages(initialMessages)
  }, [channelId, otherUserId, initialMessages])

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit triggered, selectedFile:', selectedFile)  // Debug log
    if (!newMessage.trim() && !selectedFile) return

    try {
      let fileData = null
      
      if (selectedFile) {
        console.log('Preparing to upload file:', selectedFile)  // Debug log
        const formData = new FormData()
        formData.append('file', selectedFile)
        
        console.log('Sending upload request...')  // Debug log
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })
        
        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text()
          console.error('Upload failed:', errorText)  // Debug log
          throw new Error(`Failed to upload file: ${errorText}`)
        }
        
        fileData = await uploadResponse.json()
        console.log('Upload successful:', fileData)  // Debug log
      }

      const endpoint = isDM ? '/api/direct-messages' : '/api/messages'
      const body = isDM 
        ? { 
            content: newMessage, 
            receiverId: otherUserId,
            workspaceId,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileType: fileData?.type,
          }
        : { 
            content: newMessage, 
            channelId,
            fileUrl: fileData?.url,
            fileName: fileData?.name,
            fileType: fileData?.type,
          }

      console.log('Sending message with body:', body);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setNewMessage('')
      setSelectedFile(null)
    } catch (error) {
      console.error('Error sending message:', error)
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      const endpoint = isDM 
        ? `/api/direct-messages/${messageId}`
        : `/api/messages/${messageId}`

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
      const endpoint = isDM 
        ? `/api/direct-messages/${messageId}`
        : `/api/messages/${messageId}`

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
        : `/api/messages/${messageId}/reactions/${reactionId}`
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to remove reaction')
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
      console.error('Failed to remove reaction:', error)
    }
  }

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
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
              fileUrl={message.fileUrl}
              fileName={message.fileName}
              fileType={message.fileType}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-[#3F0E40]"
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('File selected in onChange:', file);
                setSelectedFile(file);
                // Reset the input value to allow the same file to be selected again
                e.target.value = '';
              }
            }}
            accept="image/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onClick={(e) => {
              // Reset the value when clicking to ensure the same file can be selected
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <button
            type="button"
            onClick={() => {
              console.log('File button clicked'); // Debug log
              fileInputRef.current?.click();
            }}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            <PaperclipIcon className="w-5 h-5 text-gray-500" />
          </button>
          <button 
            type="submit"
            className="px-4 py-2 bg-[#3F0E40] text-white rounded-md hover:bg-[#2F0B30]"
          >
            Send
          </button>
        </div>

        {selectedFile && (
          <div className="mt-2 flex items-center gap-2 bg-gray-50 p-2 rounded-md">
            <span className="text-sm text-gray-600">
              Selected file: {selectedFile.name}
            </span>
            <button
              type="button"
              onClick={() => {
                console.log('Clear file button clicked'); // Debug log
                setSelectedFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="text-red-500 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </form>
    </div>
  )
} 