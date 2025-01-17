'use client'

import { useState, useRef, useEffect, memo } from 'react'
import Image from 'next/image'
import { Pencil, Trash2, X, Check, Smile, SmilePlus, PaperclipIcon, MessageSquare, Play, Pause } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'
import { Message as MessageType, Reaction } from '@/types'
import DefaultAvatar from '@/components/ui/default-avatar'
import { useWorkspaceMembers } from '@/contexts/workspace-members-context'

type MessageProps = MessageType & {
  onDelete: (messageId: string) => void
  onEdit: (messageId: string, newContent: string) => void
  onReact: (messageId: string, emoji: string) => void
  onRemoveReaction: (messageId: string, reactionId: string) => void
  onThreadClick?: () => void
  isThreadReply?: boolean
  isDM?: boolean
  conversationId?: boolean
  isVoiceResponse?: boolean
}

const audioManager = {
  currentAudio: null as HTMLAudioElement | null,
  currentUrl: null as string | null,
  isPlaying: false,
  play(url: string) {
    // If same audio is playing, pause it
    if (this.currentUrl === url && this.isPlaying) {
      this.currentAudio?.pause();
      this.isPlaying = false;
      return false;
    }
    
    // If different audio is playing, stop it
    if (this.currentAudio && this.currentUrl !== url) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    
    // Start new audio
    const audio = new Audio(url);
    audio.addEventListener('ended', () => {
      this.isPlaying = false;
      this.currentUrl = null;
      this.currentAudio = null;
    });
    
    audio.play();
    this.currentAudio = audio;
    this.currentUrl = url;
    this.isPlaying = true;
    return true;
  },
  isPlayingUrl(url: string) {
    return this.currentUrl === url && this.isPlaying;
  }
};

// Move AudioPlayer outside and memoize it
const AudioPlayer = memo(({ fileUrl }: { fileUrl: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    const checkPlayingStatus = () => {
      setIsPlaying(audioManager.isPlayingUrl(fileUrl));
    };
    
    // Check status every 100ms
    const interval = setInterval(checkPlayingStatus, 100);
    return () => clearInterval(interval);
  }, [fileUrl]);
  
  const togglePlayPause = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newIsPlaying = audioManager.play(fileUrl);
    setIsPlaying(newIsPlaying);
  };

  return (
    <div className="mt-0">
      <button
        onClick={togglePlayPause}
        className="flex items-center gap-2 py-0.5 px-2 bg-gray-50 rounded"
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 text-purple-500" />
        ) : (
          <Play className="w-4 h-4 text-gray-500" />
        )}
        <span className="text-sm text-gray-600">Voice Response</span>
      </button>
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';

const FileAttachment = memo(({ fileName, fileUrl, isVoiceResponse }: { fileName: string, fileUrl: string, isVoiceResponse?: boolean }) => {
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName.toLowerCase())
  
  if (isVoiceResponse) {
    return <AudioPlayer fileUrl={fileUrl} />;
  }
  
  if (isImage) {
    return (
      <div className="mt-2">
        <div className="relative bg-gray-50 rounded-md overflow-hidden w-64">
          <img
            src={fileUrl}
            alt={fileName}
            className="rounded-md object-cover w-full"
          />
        </div>
        <a 
          href={fileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-500 hover:underline mt-1 block"
        >
          {fileName}
        </a>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <a
        href={fileUrl}
        download={fileName}
        className="flex items-center gap-2 p-2 bg-gray-50 rounded-md hover:bg-gray-100 max-w-sm"
      >
        <PaperclipIcon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-blue-500">{fileName}</span>
      </a>
    </div>
  )
});

FileAttachment.displayName = 'FileAttachment';

export default function Message({ 
  id,
  content, 
  userName, 
  userImage, 
  createdAt,
  userId,
  channelId,
  reactions = [],
  fileUrl,
  fileName,
  fileType,
  onDelete,
  onEdit,
  onReact,
  onRemoveReaction,
  onThreadClick,
  replyCount = 0,
  isThreadReply = false,
  isDM = false,
  conversationId = false,
  isVoiceResponse = false
}: MessageProps) {
  const { userId: currentUserId } = useAuth()
  const { members } = useWorkspaceMembers()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isHovered, setIsHovered] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 })
  
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)

  const isOwner = currentUserId === userId

  // Get the latest user image from workspace members
  const member = members.find(m => m.userId === userId)
  const currentUserImage = member?.userImage || userImage

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
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Safe date formatting
  const getTimeAgo = (date: Date | string) => {
    try {
      const messageDate = typeof date === 'string' ? new Date(date) : date
      if (isNaN(messageDate.getTime())) {
        return 'Invalid date'
      }
      
      const now = new Date()
      const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)
      
      if (diffInSeconds < 60) return 'just now'
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
      if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
      return messageDate.toLocaleDateString()
    } catch (error) {
      console.error('Date formatting error:', error)
      return 'Invalid date'
    }
  }

  // Group reactions by emoji
  const groupedReactions = reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction)
    return acc
  }, {} as Record<string, any[]>) || {}

  // Add handleKeyDown function
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    } else if (e.key === 'Escape') {
      setEditedContent(content)
      setIsEditing(false)
    }
  }

  // Add handleEdit function if not already defined
  const handleEdit = () => {
    if (editedContent.trim() && editedContent !== content) {
      onEdit(id, editedContent)
    }
    setIsEditing(false)
  }

  // Add mouseLeave handler for the emoji picker
  const handleMouseLeave = (e: React.MouseEvent) => {
    const pickerElement = emojiPickerRef.current;
    const buttonElement = emojiButtonRef.current;
    const relatedTarget = e.relatedTarget as Node;

    if (
      pickerElement && 
      buttonElement && 
      !pickerElement.contains(relatedTarget) && 
      !buttonElement.contains(relatedTarget)
    ) {
      setShowEmojiPicker(false);
    }
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return (
      <>
        {parts.map((part, index) => {
          if (part.match(urlRegex)) {
            return (
              <a
                key={index}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline break-all"
              >
                {part}
              </a>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </>
    );
  };

  // console.log('Message render:', {
  //   content,
  //   fileUrl,
  //   fileName,
  //   fileType
  // });

  return (
    <>
      <div 
        className="group relative px-2 py-2 hover:bg-gray-50 flex gap-2"
        onMouseEnter={(e) => {
          e.stopPropagation();
          setIsHovered(true);
        }}
        onMouseLeave={(e) => {
          e.stopPropagation();
          setIsHovered(false);
        }}
      >
        <div className="relative w-10 h-10 flex-shrink-0">
          {currentUserImage ? (
            <div className="w-full h-full relative rounded-md overflow-hidden">
              <img
                src={currentUserImage}
                alt={userName}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <DefaultAvatar
              userId={userId}
              name={userName}
              className="w-full h-full rounded-md"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{userName}</span>
            <span className="text-xs text-gray-500">
              {getTimeAgo(createdAt)}
            </span>
            {isHovered && !isEditing && (
              <div className="flex items-center gap-2 ml-auto">
                <button
                  ref={emojiButtonRef}
                  onClick={handleEmojiButtonClick}
                  onMouseLeave={handleMouseLeave}
                  className="p-1 text-gray-600 hover:text-gray-700"
                >
                  <SmilePlus className="w-4 h-4" />
                </button>
                {isOwner && (
                  <>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="p-1 text-gray-600 hover:text-gray-700"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(id)}
                      className="p-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="text"
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
              <button
                onClick={handleEdit}
                className="p-1 text-green-600 hover:text-green-700"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setEditedContent(content)
                  setIsEditing(false)
                }}
                className="p-1 text-gray-600 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <p className="mt-1">{renderTextWithLinks(content)}</p>
              {fileUrl && fileName && !isVoiceResponse && (
                <FileAttachment 
                  fileName={fileName} 
                  fileUrl={fileUrl} 
                  isVoiceResponse={false}
                />
              )}
              
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                  <button
                    key={emoji}
                    onClick={() => onReact(id, emoji)}
                    className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                      ${reactions.some(r => r.userId === currentUserId)
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-700'
                      }
                      hover:bg-indigo-200 transition-colors
                    `}
                  >
                    <span>{emoji}</span>
                    <span>{reactions.length}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {!isThreadReply && !isDM && onThreadClick && !conversationId && (
          <button
            onClick={onThreadClick}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            <MessageSquare className="h-4 w-4" />
            {replyCount > 0 && (
              <span className="text-xs">
                {replyCount} {replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Voice response player moved outside hover area */}
      {fileUrl && fileName && isVoiceResponse && (
        <div className="pl-12 -mt-4">
          <FileAttachment 
            fileName={fileName} 
            fileUrl={fileUrl} 
            isVoiceResponse={true}
          />
        </div>
      )}

      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          className="fixed z-[9999]"
          style={{
            top: `${pickerPosition.top}px`,
            left: `${pickerPosition.left}px`,
          }}
          onMouseLeave={handleMouseLeave}
        >
          <div className="bg-white shadow-lg rounded-lg border">
            <Picker
              data={data}
              onEmojiSelect={(emoji: any) => {
                onReact(id, emoji.native);
                setShowEmojiPicker(false);
              }}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        </div>
      )}
    </>
  )
} 