'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import Message from './message'
import Thread from './thread'
import { PaperclipIcon, X, Wand2 } from 'lucide-react'
import { Message as MessageType, Reaction } from '@/types'
import { useWorkspaceMembers } from '@/contexts/workspace-members-context'
import { useMessages } from '@/contexts/message-context'
import { usePusher } from '@/contexts/pusher-context'
import { getSimilarMessages } from '@/lib/vector-store'
import { pusherClient } from '@/lib/pusher'

declare global {
  interface Window {
    __clerk_db_jwt?: string;
    Clerk?: {
      session?: {
        getToken: () => Promise<string>;
      };
    };
  }
}

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
  const { members } = useWorkspaceMembers()
  const { getChannelMessages, addMessage, updateMessage, deleteMessage } = useMessages()
  const { subscribeToChannel, unsubscribeFromChannel } = usePusher()
  const [allMessages, setAllMessages] = useState<{
    [key: string]: MessageType
  }>({});
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
  const [isGenerating, setIsGenerating] = useState(false);

  // Initialize messages
  useEffect(() => {
    initialMessages.forEach(addMessage)
  }, [])

  // Subscribe to channel
  useEffect(() => {
    if (!channelId && !isDM) return
    
    const channelName = isDM 
      ? `dm-${[otherUserId, userId].sort().join('-')}` 
      : `channel-${channelId}`

    subscribeToChannel(channelName)
    
    return () => {
      unsubscribeFromChannel(channelName)
    }
  }, [channelId, isDM, otherUserId, userId])

  // Get filtered messages for this channel or DM
  const messages = isDM 
    ? Object.values(allMessages)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    : channelId 
      ? getChannelMessages(channelId) 
      : [];

  // Update messages with latest member info
  useEffect(() => {
    if (!members.length) return;

    setAllMessages(current => {
      const updated = { ...current };
      Object.keys(current).forEach(id => {
        const message = current[id];
        const member = members.find(m => m.userId === message.userId);
        if (member) {
          updated[id] = {
            ...message,
            userName: member.userName || message.userName,
            userImage: member.userImage || message.userImage
          };
        }
      });
      return updated;
    });
  }, [members]);

  // Fetch messages when channel or DM user changes
  useEffect(() => {
    const fetchMessages = async () => {
      if (!channelId && !isDM) return;
      
      try {
        let response;
        if (isDM && workspaceId && otherUserId) {
          response = await fetch(`/api/direct-messages?workspaceId=${workspaceId}&otherUserId=${otherUserId}`);
        } else if (channelId) {
          response = await fetch(`/api/channels/${channelId}/messages`);
        } else {
          return;
        }

        if (!response.ok) throw new Error('Failed to fetch messages');
        
        const data = await response.json();
        const messageMap: { [key: string]: MessageType } = {};
        data.forEach((message: MessageType) => {
          const member = members.find(m => m.userId === message.userId);
          messageMap[message.id] = {
            ...message,
            userName: member?.userName || message.userName,
            userImage: member?.userImage || message.userImage
          };
        });
        setAllMessages(messageMap);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, [channelId, isDM, workspaceId, otherUserId, members]);

  // Pusher subscription
  useEffect(() => {
    if (!channelId && !isDM) return;
    
    const channelName = isDM 
      ? `dm-${[otherUserId, userId].sort().join('-')}` 
      : `channel-${channelId}`
    
    console.log('Subscribing to channel:', channelName);
    pusherClient.unsubscribe(channelName);
    const channel = pusherClient.subscribe(channelName);

    const handleMessage = (message: MessageType) => {
      console.log('Received message:', message);
      
      // For DMs, add all messages
      if (isDM) {
        setAllMessages(current => ({
          ...current,
          [message.id]: {
            ...message,
            userName: message.userName || current[message.id]?.userName,
            userImage: message.userImage || current[message.id]?.userImage
          }
        }));
        
        setTimeout(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
        return;
      }
      
      // For regular messages, skip thread messages
      if (message.threadId || message.isThreadReply) {
        console.log('Skipping thread message:', message);
        return;
      }
      
      setAllMessages(current => ({
        ...current,
        [message.id]: {
          ...message,
          userName: message.userName || current[message.id]?.userName,
          userImage: message.userImage || current[message.id]?.userImage
        }
      }));

      // Scroll for new main messages
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    const handleDelete = (messageId: string) => {
      setAllMessages(current => {
        const { [messageId]: deleted, ...rest } = current;
        return rest;
      });
    };

    channel.bind('new-message', handleMessage);
    channel.bind('message-update', handleMessage);
    channel.bind('message-delete', handleDelete);

    return () => {
      channel.unbind('new-message', handleMessage);
      channel.unbind('message-update', handleMessage);
      channel.unbind('message-delete', handleDelete);
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
      // Get the Clerk session token
      const token = await window.Clerk?.session?.getToken();
      
      if (!token) {
        console.error('No auth token available');
        throw new Error('Authentication required');
      }

      let uploadResult;
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          },
          body: formData
        });
        if (!uploadResponse.ok) throw new Error('Failed to upload file');
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

      console.log('Sending message with data:', messageData);

      const response = await fetch(isDM ? '/api/direct-messages' : '/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(messageData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || 'Failed to send message');
      }

      const responseData = await response.json();
      console.log('Message sent successfully:', responseData);

      setNewMessage('')
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error sending message:', error)
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
      setAllMessages(current => {
        const { [messageId]: deleted, ...rest } = current;
        return rest;
      });
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
      
      setAllMessages(current => {
        const updated = { ...current };
        updated[messageId] = {
          ...updated[messageId],
          reactions: updatedMessage.reactions
        };
        return updated;
      });
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
      
      setAllMessages(current => {
        const updated = { ...current };
        updated[messageId] = {
          ...updated[messageId],
          reactions: updatedMessage.reactions
        };
        return updated;
      });
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
    setAllMessages(current => {
      const updated = { ...current };
      updated[messageId] = {
        ...updated[messageId],
        replyCount: newCount
      };
      return updated;
    });
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

  const handleGenerate = async () => {
    const currentMessages = Object.values(allMessages);
    if (currentMessages.length === 0) return;
    
    setIsGenerating(true);
    try {
      // Get the last message as the prompt
      const lastMessage = currentMessages[currentMessages.length - 1];
      console.log('Using last message as prompt:', lastMessage.content);
      
      // Add temporary loading message
      const tempId = 'temp-' + Date.now();
      const loadingMessage = {
        id: tempId,
        content: '',
        createdAt: new Date(),
        userId: 'system',
        userName: 'AI Assistant',
        userImage: '/ai-avatar.png',
        reactions: [],
        isLoading: true
      };
      
      // Update allMessages to include loading message
      setAllMessages(prev => ({
        ...prev,
        [tempId]: loadingMessage
      }));

      // Generate response using the context
      const response = await fetch('/api/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: lastMessage.content,
          channelId,
          workspaceId
        })
      });

      if (!response.ok) throw new Error('Failed to generate response');
      const data = await response.json();
      
      // Remove loading message before sending actual message
      setAllMessages(prev => {
        const updated = { ...prev };
        delete updated[tempId];
        return updated;
      });
      
      // Send the AI-generated response
      const messageData = {
        content: data.response,
        workspaceId,
        ...(isDM ? { receiverId: otherUserId } : { channelId })
      };

      console.log('Sending message with data:', messageData);

      const submitResponse = await fetch(isDM ? '/api/direct-messages' : '/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(window.__clerk_db_jwt && {
            'Authorization': `Bearer ${window.__clerk_db_jwt}`
          })
        },
        body: JSON.stringify(messageData)
      });

      if (!submitResponse.ok) {
        const errorData = await submitResponse.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.message || 'Failed to send generated response');
      }
      
    } catch (error) {
      console.error('Error in generate flow:', error);
      setNewMessage('Failed to generate and send response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

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
                  {...message}
                  onDelete={handleDelete}
                  onEdit={handleEdit}
                  onReact={handleReact}
                  onRemoveReaction={handleRemoveReaction}
                  onThreadClick={isDM ? undefined : () => handleThreadClick(message)}
                  isThreadReply={false}
                  isDM={isDM}
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
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="p-2 hover:bg-gray-100 rounded flex items-center gap-2 disabled:opacity-50"
              >
                {isGenerating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-purple-500" />
                ) : (
                  <Wand2 className="h-5 w-5 text-purple-500" />
                )}
                <span className="text-purple-500">{isGenerating ? 'Generating...' : 'Generate'}</span>
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