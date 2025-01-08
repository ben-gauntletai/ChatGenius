'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

interface DirectMessageUser {
  userId: string;
  userName: string;
  userImage: string;
}

export default function DirectMessageList({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const params = useParams();
  const { userId: currentUserId } = useAuth();
  const [members, setMembers] = useState<DirectMessageUser[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        const data = await response.json();
        // Filter out current user from the list
        setMembers(data.filter((member: DirectMessageUser) => member.userId !== currentUserId));
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembers();
  }, [workspaceId, currentUserId]);

  const handleUserClick = (userId: string) => {
    router.push(`/${workspaceId}/dm/${userId}`);
  };

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
          {isLoading ? (
            <div className="px-2 py-1 text-white/50 text-sm">Loading...</div>
          ) : (
            members.map((member) => (
              <button
                key={member.userId}
                onClick={() => handleUserClick(member.userId)}
                className={`w-full flex items-center gap-2 rounded px-2 py-[6px] hover:bg-white/10 transition-colors ${
                  params.userId === member.userId ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex-shrink-0 w-5 h-5 relative">
                  <Image
                    src={member.userImage}
                    alt={member.userName}
                    width={20}
                    height={20}
                    className="rounded-sm object-cover"
                  />
                </div>
                <span className="text-white/70 text-[15px] truncate flex-1 text-left">
                  {member.userName}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
} 