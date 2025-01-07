'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import { Pencil, Trash2, X, Check, Smile } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface Reaction {
  emoji: string
  userId: string
  userName: string
}

interface MessageProps {
  id: string
  content: string
  userName: string
  userImage: string
  createdAt: Date
  userId: string
  channelId: string
  reactions: Reaction[]
  onDelete: (messageId: string) => void
  onEdit: (messageId: string, newContent: string) => void
  onReact: (messageId: string, emoji: string) => void
}

export default function Message({ 
  id,
  content, 
  userName, 
  userImage, 
  createdAt,
  userId,
  channelId,
  reactions = [],
  onDelete,
  onEdit,
  onReact
}: MessageProps) {
  const { userId: currentUserId } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(content)
  const [isHovered, setIsHovered] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const emojiButtonRef = useRef<HTMLButtonElement>(null)
  const emojiPickerRef = useRef<HTMLDivElement>(null)
  const [pickerPosition, setPickerPosition] = useState<'top' | 'bottom'>('bottom')

  const isOwner = currentUserId === userId

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = []
    }
    acc[reaction.emoji].push(reaction)
    return acc
  }, {} as Record<string, Reaction[]>)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current?.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!emojiButtonRef.current) return;

    const calculatePosition = () => {
      const buttonRect = emojiButtonRef.current?.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceBelow = windowHeight - (buttonRect?.bottom || 0);
      
      // If there's less than 400px below the button, show picker above
      setPickerPosition(spaceBelow < 400 ? 'top' : 'bottom');
    };

    calculatePosition();
    window.addEventListener('scroll', calculatePosition);
    window.addEventListener('resize', calculatePosition);

    return () => {
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [showEmojiPicker]);

  const handleEdit = () => {
    if (editedContent.trim() === content) {
      setIsEditing(false)
      return
    }
    
    onEdit(id, editedContent)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEdit()
    }
    if (e.key === 'Escape') {
      setEditedContent(content)
      setIsEditing(false)
    }
  }

  const handleEmojiSelect = (emoji: any) => {
    onReact(id, emoji.native)
    setShowEmojiPicker(false)
  }

  return (
    <div 
      className="flex items-start gap-3 px-4 py-2 hover:bg-gray-50 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Image
        src={userImage}
        alt={userName}
        width={36}
        height={36}
        className="rounded mt-1"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[15px]">{userName}</span>
          <span className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </span>
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
            <p className="text-[15px] text-gray-900">{content}</p>
            
            {/* Reactions */}
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

      {isHovered && !isEditing && (
        <div className="absolute right-4 top-2 flex items-center gap-2 bg-white shadow-sm border rounded-md px-1">
          <button
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-1 text-gray-600 hover:text-gray-700"
          >
            <Smile className="w-4 h-4" />
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

      {showEmojiPicker && (
        <div 
          ref={emojiPickerRef}
          style={{
            position: 'absolute',
            right: '1rem',
            ...(pickerPosition === 'top' 
              ? { bottom: '100%', marginBottom: '0.5rem' }
              : { top: '3rem' }
            ),
            zIndex: 50
          }}
        >
          <div className="shadow-lg rounded-lg">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
              searchPosition="none"
              maxFrequentRows={2}
            />
          </div>
        </div>
      )}
    </div>
  )
} 