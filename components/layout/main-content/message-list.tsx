'use client'

import { useRef, useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { pusherClient } from '@/lib/pusher'
import Message from './message'
import Thread from './thread'
import { PaperclipIcon, X } from 'lucide-react'
import { Message as MessageType, Reaction } from '@/types'

interface Profile {
  name: string;
  image: string | null;
}

export default function MessageList({ 
  initialMessages = [],
  channelId,
  workspaceId,
  isDM = false,
  otherUserId
}: { 
  initialMessages: MessageType[]
  channelId?: string
  workspaceId?: string
  isDM?: boolean
  otherUserId?: string
}) {
  const { userId } = useAuth()
  const [messages, setMessages] = useState<MessageType[]>(initialMessages)
  const [activeThread, setActiveThread] = useState<MessageType | null>(null)
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
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageType | null>(null);
  const [isThreadOpen, setIsThreadOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    url: string;
    name: string;
    type: string;
  } | null>(null);
  const [latestProfiles, setLatestProfiles] = useState<Record<string, Profile>>({});

  // Fetch initial profile data
  useEffect(() => {
    const fetchProfiles = async () => {
      if (!workspaceId) return;
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!response.ok) throw new Error('Failed to fetch members');
        
        const members = await response.json();
        const profiles = members.reduce((acc: Record<string, Profile>, member: any) => {
          acc[member.userId] = {
            name: member.hasCustomName ? member.userName : 'User',
            image: member.hasCustomImage && member.userImage?.startsWith('/api/files/') ? member.userImage : null
          };
          return acc;
        }, {});
        
        setLatestProfiles(profiles);
        
        // Update existing messages with latest profile info
        setMessages(current => 
          current.map(message => ({
            ...message,
            userName: profiles[message.userId]?.name || 'User',
            userImage: profiles[message.userId]?.image || null
          }))
        );
      } catch (error) {
        console.error('Failed to fetch profiles:', error);
      }
    };

    fetchProfiles();
  }, [workspaceId]);

  // Fetch messages when channel or DM user changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!channelId && !isDM) return;
      
      try {
        let response;
        if (isDM && workspaceId && otherUserId) {
          response = await fetch(`/api/direct-messages?workspaceId=${workspaceId}&otherUserId=${otherUserId}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
        } else if (channelId) {
          response = await fetch(`/api/channels/${channelId}/messages`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          });
        } else {
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [channelId, isDM, workspaceId, otherUserId]);

  // Pusher subscription
  useEffect(() => {
    if (!channelId && !isDM) return;
    
    const channelName = isDM 
      ? `dm-${[otherUserId, userId].sort().join('-')}` 
      : `channel-${channelId}`
    
    pusherClient.unsubscribe(channelName);
    const channel = pusherClient.subscribe(channelName);

    // Bind events
    const newMessageHandler = async (message: MessageType) => {
      console.log('Received new message:', message);
      setMessages(current => {
        // Check if message already exists to prevent duplicates
        const exists = current.some(m => m.id === message.id);
        if (exists) return current;
        
        // Use latest profile info if available
        const latestProfile = latestProfiles[message.userId];
        const updatedMessage = latestProfile ? {
          ...message,
          userName: latestProfile.name,
          userImage: latestProfile.image
        } : message;
        
        return [...current, updatedMessage];
      });
      
      // Always scroll to bottom when new message arrives
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    const updateMessageHandler = (updatedMessage: MessageType) => {
      console.log('Received message update:', updatedMessage);
      setMessages(current =>
        current.map(message =>
          message.id === updatedMessage.id
            ? {
                ...message,
                ...updatedMessage,
                userName: updatedMessage.userName || message.userName,
                userImage: updatedMessage.userImage || message.userImage,
                reactions: updatedMessage.reactions
              }
            : message
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
  }, [channelId, isDM, otherUserId, userId, latestProfiles]);

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
      console.log('Received profile update in message list:', data);
      
      // Update latestProfiles
      setLatestProfiles(current => ({
        ...current,
        [data.userId]: {
          name: data.hasCustomName ? data.name : 'User',
          image: data.hasCustomImage && data.imageUrl?.startsWith('/api/files/') ? data.imageUrl : null
        }
      }));
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId]);

  // Update messages when latestProfiles changes
  useEffect(() => {
    setMessages(current =>
      current.map(message => ({
        ...message,
        userName: latestProfiles[message.userId]?.name || message.userName,
        userImage: latestProfiles[message.userId]?.image || message.userImage
      }))
    );
  }, [latestProfiles]);

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
    <div className="flex-1 flex h-full">
      <div className="flex-1 flex flex-col h-full relative">
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col min-h-full justify-end">
            <div className="flex-1" />
      <div>
        {messages.map((message) => (
          <Message
            key={message.id}
            id={message.id}
            content={message.content}
            userName={message.userName}
            userImage={message.userImage}
            createdAt={message.createdAt}
            userId={message.userId}
            channelId={message.channelId}
            reactions={message.reactions}
            fileUrl={message.fileUrl ?? undefined}
            fileName={message.fileName ?? undefined}
            fileType={message.fileType ?? undefined}
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
        </div>

        <div className="sticky bottom-0 bg-white border-t">
          <form onSubmit={handleSubmit} className="p-4">
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