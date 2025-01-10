'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { ChevronDown, Users, MessageSquare, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { pusherClient } from '@/lib/pusher';
import DefaultAvatar from '@/components/ui/default-avatar';

interface Member {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  role: string;
  hasCustomName: boolean;
  hasCustomImage: boolean;
}

export default function MemberList({ workspaceId }: { workspaceId: string }) {
  const { userId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);

    // Listen for profile updates
    channel.bind('profile-update', (data: {
      userId: string;
      name: string;
      imageUrl: string | null;
      hasCustomName: boolean;
      hasCustomImage: boolean;
    }) => {
      setMembers(current =>
        current.map(member =>
          member.userId === data.userId
            ? {
                ...member,
                userName: data.hasCustomName ? data.name : 'User',
                userImage: data.hasCustomImage && data.imageUrl?.startsWith('/api/files/') ? data.imageUrl : null,
                hasCustomName: data.hasCustomName,
                hasCustomImage: data.hasCustomImage
              }
            : member
        )
      );
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId]);

  useEffect(() => {
    let mounted = true;

    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
          cache: 'no-store'
        });
        const data = await response.json();
        if (mounted) {
          setMembers(data);
        }
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMembers();

    return () => {
      mounted = false;
    };
  }, [workspaceId]);

  // Sort members to put current user first
  const sortedMembers = [...members].sort((a, b) => {
    if (a.userId === userId) return -1;
    if (b.userId === userId) return 1;
    return a.userName.localeCompare(b.userName);
  });

  return (
    <div className="px-2">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center group px-2 py-[6px]"
      >
        <ChevronDown className={`w-3 h-3 text-white/70 mr-1 transition-transform ${
          isExpanded ? '' : '-rotate-90'
        }`} />
        <Users className="w-4 h-4 text-white/70 mr-2" />
        <span className="text-[15px] text-white/70">Members</span>
        <span className="ml-auto text-xs text-white/50">
          {isLoading ? '-' : members.length}
        </span>
      </button>
      
      {isExpanded && (
        <div className="mt-1 space-y-[2px]">
          {isLoading ? (
            <div className="flex justify-center py-2">
              <Loader2 className="w-4 h-4 text-white/50 animate-spin" />
            </div>
          ) : (
            sortedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center px-2 py-[6px] rounded-md text-[15px] text-white/70 hover:bg-[#350D36] group"
              >
                <div className="w-4 h-4 relative rounded-sm overflow-hidden mr-2">
                  {member.hasCustomImage && member.userImage?.startsWith('/api/files/') ? (
                    <img
                      src={member.userImage}
                      alt={member.userName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <DefaultAvatar
                      userId={member.userId}
                      name={member.userName}
                      className="w-full h-full text-[8px]"
                    />
                  )}
                </div>
                <span>
                  {member.userId === userId ? 'You' : member.userName}
                  {member.role === 'ADMIN' && (
                    <span className="ml-1 text-xs text-white/50">(admin)</span>
                  )}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
} 