'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DirectMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    userId: string;
    userName: string;
    userImage: string;
  };
  currentUserId: string;
}

export default function DirectMessageModal({
  isOpen,
  onClose,
  member,
  currentUserId
}: DirectMessageModalProps) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // First, ensure a conversation exists
      const conversationResponse = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otherUserId: member.userId,
        }),
      });

      if (!conversationResponse.ok) throw new Error('Failed to create conversation');
      const { conversationId } = await conversationResponse.json();

      // Send the message
      const messageResponse = await fetch('/api/direct-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: message,
          receiverId: member.userId,
          receiverName: member.userName,
          receiverImage: member.userImage,
        }),
      });

      if (!messageResponse.ok) throw new Error('Failed to send message');

      // Navigate to the DM conversation
      router.push(`/conversations/${conversationId}`);
      onClose();
    } catch (error) {
      console.error('Error sending DM:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-[400px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Message {member.userName}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            className="w-full border rounded-lg p-3 mb-4 h-32 resize-none"
            disabled={isSubmitting}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#3F0E40] text-white rounded-md hover:bg-[#4A154B] disabled:opacity-50"
              disabled={isSubmitting || !message.trim()}
            >
              Send Message
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 