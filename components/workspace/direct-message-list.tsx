'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface DirectMessage {
  userId: string;
  userName: string;
  userImage: string;
  lastMessage?: string;
}

export default function DirectMessageList({ workspaceId }: { workspaceId: string }) {
  const { userId } = useAuth();
  const router = useRouter();
  const [conversations, setConversations] = useState<DirectMessage[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const response = await fetch('/api/conversations');
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error('Failed to fetch conversations:', error);
      }
    };

    fetchConversations();
  }, []);

  return (
    <div className="px-2 mb-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center group px-2 py-[6px]"
      >
        <ChevronDown className={`w-3 h-3 text-white/70 mr-1 transition-transform ${
          isExpanded ? '' : '-rotate-90'
        }`} />
        <MessageSquare className="w-4 h-4 text-white/70 mr-2" />
        <span className="text-[15px] text-white/70">Direct Messages</span>
      </button>
      
      {isExpanded && (
        <div className="mt-1 space-y-[2px]">
          {conversations.map((conversation) => (
            <button
              key={conversation.userId}
              onClick={() => router.push(`/${workspaceId}/dm/${conversation.userId}`)}
              className="w-full flex items-center px-2 py-[6px] rounded-md text-[15px] text-white/70 hover:bg-[#350D36]"
            >
              <Image
                src={conversation.userImage}
                alt={conversation.userName}
                width={16}
                height={16}
                className="rounded-full mr-2"
              />
              <span>{conversation.userName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 