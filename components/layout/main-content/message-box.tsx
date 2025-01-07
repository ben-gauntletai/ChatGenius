'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { format } from 'date-fns';
import { Edit2, Trash2, SmilePlus } from 'lucide-react';
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface Message {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  userName: string;
  userImage: string;
  reactions?: {
    id: string;
    emoji: string;
    userId: string;
    userName: string;
  }[];
}

interface MessageBoxProps {
  message: Message;
  currentUserId: string;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string, newContent: string) => void;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction?: (messageId: string, reactionId: string) => void;
}

export default function MessageBox({ 
  message, 
  currentUserId, 
  onDelete, 
  onEdit,
  onReact,
  onRemoveReaction 
}: MessageBoxProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerPosition, setPickerPosition] = useState({ top: 0, left: 0 });
  const messageRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isOwner = message.userId === currentUserId;
  const formattedDate = format(new Date(message.createdAt), 'MMM d, h:mm a');
  const reactions = message.reactions || [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current && 
        !pickerRef.current.contains(event.target as Node) &&
        emojiButtonRef.current && 
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditing) {
      editInputRef.current?.focus();
    }
  }, [isEditing]);

  const handleSaveEdit = () => {
    if (editedContent.trim() === message.content) {
      setIsEditing(false);
      return;
    }
    
    onEdit(message.id, editedContent.trim());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    }
    if (e.key === 'Escape') {
      setEditedContent(message.content);
      setIsEditing(false);
    }
  };

  const handleEmojiSelect = (emoji: any) => {
    onReact(message.id, emoji.native);
    setShowEmojiPicker(false);
  };

  const handleEmojiButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!emojiButtonRef.current) return;
    
    const buttonRect = emojiButtonRef.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const pickerHeight = 400;

    // If button is in the bottom 400px of viewport, show picker above
    const shouldShowAbove = windowHeight - buttonRect.top < pickerHeight;

    setPickerPosition({
      top: shouldShowAbove ? buttonRect.top - pickerHeight : buttonRect.top,
      left: buttonRect.left - 300 // Picker width
    });
    
    setShowEmojiPicker(!showEmojiPicker);
  };

  return (
    <div 
      ref={messageRef}
      className="group flex items-start space-x-3 hover:bg-gray-50 p-2 rounded-lg relative"
    >
      <Image
        src={message.userImage}
        alt={message.userName}
        width={40}
        height={40}
        className="rounded-full"
      />
      <div className="flex-1">
        <div className="flex items-center">
          <span className="font-semibold">{message.userName}</span>
          <span className="ml-2 text-xs text-gray-500">{formattedDate}</span>
          {isOwner && (
            <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(true)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Edit2 className="w-4 h-4 text-gray-500" />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <Trash2 className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          )}
          <div className="relative ml-2">
            <button
              ref={emojiButtonRef}
              onClick={handleEmojiButtonClick}
              className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100"
            >
              <SmilePlus className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
        
        {isEditing ? (
          <div className="mt-1 flex items-center space-x-2">
            <input
              ref={editInputRef}
              type="text"
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 border rounded px-2 py-1"
            />
            <button
              onClick={handleSaveEdit}
              className="px-2 py-1 bg-[#3F0E40] text-white rounded text-sm"
            >
              Save
            </button>
            <button
              onClick={() => {
                setEditedContent(message.content);
                setIsEditing(false);
              }}
              className="px-2 py-1 bg-gray-200 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        ) : (
          <p className="mt-1">{message.content}</p>
        )}

        {reactions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {reactions.map((reaction) => (
              <button
                key={`${reaction.id}-${reaction.emoji}`}
                onClick={() => onRemoveReaction?.(message.id, reaction.id)}
                className={`inline-flex items-center px-2 py-1 bg-gray-100 rounded-full text-sm hover:bg-gray-200 ${
                  reaction.userId === currentUserId ? 'border-2 border-[#3F0E40]' : ''
                }`}
              >
                {reaction.emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {showEmojiPicker && (
        <div 
          ref={pickerRef}
          className="fixed z-[9999]"
          style={{
            top: `${pickerPosition.top}px`,
            left: `${pickerPosition.left}px`,
          }}
        >
          <div className="bg-white shadow-lg rounded-lg border">
            <Picker
              data={data}
              onEmojiSelect={handleEmojiSelect}
              theme="light"
              previewPosition="none"
              skinTonePosition="none"
            />
          </div>
        </div>
      )}
    </div>
  );
} 