'use client'

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { pusherClient } from '@/lib/pusher'
import Message from './message'
import Thread from './thread'
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
  replyCount?: number
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
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [activeThread, setActiveThread] = useState<Message | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [newMessage, setNewMessage] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const currentChannelRef = useRef<string | undefined>(channelId)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [isMouseOverPicker, setIsMouseOverPicker] = useState(false);

  // Fetch messages when channel changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!channelId) return;
      
      try {
        const response = await fetch(`/api/channels/${channelId}/messages`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [channelId]);

  // Pusher subscription
  useEffect(() => {
    if (!channelId && !isDM) return;
    
    const channelName = isDM 
      ? `dm-${[otherUserId, userId].sort().join('-')}` 
      : `channel-${channelId}`
    
    // Unsubscribe from previous channel if exists
    pusherClient.unsubscribe(channelName);
    
    const channel = pusherClient.subscribe(channelName);

    // Bind events
    const newMessageHandler = (message: Message) => {
      setMessages(current => {
        if (current.some(m => m.id === message.id)) return current;
        return [...current, message];
      });
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const updateMessageHandler = (updatedMessage: Message) => {
      setMessages(current =>
        current.map(message =>
          message.id === updatedMessage.id ? updatedMessage : message
        )
      );
    };

    const deleteMessageHandler = (messageId: string) => {
      setMessages(current =>
        current.filter(message => message.id !== messageId)
      );
    };

    channel.bind('new-message', newMessageHandler);
    channel.bind('message-update', updateMessageHandler);
    channel.bind('message-delete', deleteMessageHandler);

    return () => {
      channel.unbind('new-message', newMessageHandler);
      channel.unbind('message-update', updateMessageHandler);
      channel.unbind('message-delete', deleteMessageHandler);
      pusherClient.unsubscribe(channelName);
    };
  }, [channelId, isDM, otherUserId, userId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() && !selectedFile) return

    try {
      let uploadResult;
      
      // Handle file upload first if there's a file
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload file');
        }

        uploadResult = await uploadResponse.json();
      }

      const messageData = {
        content: newMessage,
        workspaceId,
        ...(isDM ? { receiverId: otherUserId } : { channelId }),
        fileUrl: selectedFile ? uploadResult?.url : undefined,
        fileName: selectedFile?.name,
        fileType: selectedFile?.type
      }

      const response = await fetch(isDM ? '/api/direct-messages' : '/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      })

      if (!response.ok) throw new Error('Failed to send message')

      setNewMessage('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Add user feedback here
      alert('Failed to send message. Please try again.')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Add file size validation (e.g., 10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
      if (file.size > MAX_FILE_SIZE) {
        alert('File is too large. Please select a file under 10MB.')
        e.target.value = ''
        return
      }
      setSelectedFile(file)
    }
  }

  const handleDelete = async (messageId: string) => {
    try {
      const endpoint = isDM
        ? `/api/direct-messages/${messageId}`
        : `/api/messages/${messageId}`

      const response = await fetch(endpoint, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete message')
      }

      // Optimistically remove the message from the UI
      setMessages(current =>
        current.filter(message => message.id !== messageId)
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

  const handleThreadClick = (message: any) => {
    setActiveThread(message)
  }

  const handleCloseThread = () => {
    setActiveThread(null)
  }

  const handleReplyCountChange = (messageId: string, newCount: number) => {
    setMessages(current =>
      current.map(message =>
        message.id === messageId
          ? { ...message, replyCount: newCount }
          : message
      )
    )
  }

  const handleEmojiButtonClick = () => {
    if (!emojiButtonRef.current) return;
    
    const buttonRect = emojiButtonRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const pickerHeight = 400;
    const pickerWidth = 350;

    let top = buttonRect.bottom + window.scrollY;
    let left = buttonRect.left + window.scrollX - pickerWidth;

    if (buttonRect.bottom + pickerHeight > windowHeight) {
      top = buttonRect.top + window.scrollY - pickerHeight;
    }

    if (left < 0) {
      left = buttonRect.right + window.scrollX;
    }

    if (left + pickerWidth > windowWidth) {
      left = windowWidth - pickerWidth - 20;
    }

    setPickerPosition({ top, left });
    setShowEmojiPicker(true);
  };

  const handlePickerMouseEnter = () => {
    setIsMouseOverPicker(true);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  const handlePickerMouseLeave = () => {
    setIsMouseOverPicker(false);
    startCloseTimer();
  };

  const startCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      if (!isMouseOverPicker) {
        setShowEmojiPicker(false);
      }
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="flex-1 flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col justify-end">
          <div className="overflow-y-auto">
            {messages.map((message) => (
              <Message
                key={message.id}
                {...message}
                isThreadReply={false}
                isDM={isDM}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onReact={handleReact}
                onRemoveReaction={handleRemoveReaction}
                onThreadClick={isDM ? undefined : () => handleThreadClick(message)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t">
          {selectedFile && (
            <div className="mb-2 p-2 bg-gray-100 rounded flex items-center justify-between">
              <span className="text-sm text-gray-600">{selectedFile.name}</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-gray-100 rounded"
            >
              <PaperclipIcon className="h-5 w-5 text-gray-500" />
            </button>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 p-2 border rounded"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() && !selectedFile}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      </div>

      {activeThread && (
        <Thread
          isOpen={!!activeThread}
          onClose={handleCloseThread}
          parentMessage={activeThread}
          channelId={channelId}
          workspaceId={workspaceId}
          onReplyCountChange={handleReplyCountChange}
        />
      )}
    </div>
  )
} 