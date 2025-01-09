'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronDown, MessageSquare } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { pusherClient } from '@/lib/pusher';
import DefaultAvatar from '@/components/ui/default-avatar';

interface DirectMessageUser {
  userId: string;
  userName: string;
  userImage: string;
  status: string;
  hasImage: boolean;
}

interface Member {
  userId: string;
  status: string;
}

export default function DirectMessageList({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const params = useParams() as { workspaceId: string; userId?: string };
  const { userId: currentUserId } = useAuth();
  const [members, setMembers] = useState<DirectMessageUser[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      const data = await response.json();
      
      // Filter out current user
      const filteredMembers = data.filter((member: DirectMessageUser) => 
        member.userId !== currentUserId
      );
      
      // Only update if there are actual status changes
      setMembers(current => {
        if (current.length === 0) return filteredMembers;
        
        const hasChanges = filteredMembers.some((newMember: Member) => {
          const currentMember = current.find(m => m.userId === newMember.userId);
          return !currentMember || currentMember.status !== newMember.status;
        });
        
        return hasChanges ? filteredMembers : current;
      });
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeMembers = async () => {
      await fetchMembers();
      
      // Subscribe to status updates
      const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
      
      channel.bind('member-status-update', (data: { userId: string; status: string }) => {
        console.log('Received status update:', data);
        if (mounted) {
          setMembers(current => {
            console.log('Current members:', current);
            const updated = current.map(member => 
              member.userId === data.userId 
                ? { ...member, status: data.status }
                : member
            );
            console.log('Updated members:', updated);
            return updated;
          });
        }
      });

      // Refresh when tab becomes visible
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && mounted) {
          fetchMembers();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        mounted = false;
        channel.unbind('member-status-update');
        pusherClient.unsubscribe(`workspace-${workspaceId}`);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    };

    initializeMembers();
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
                className={`w-full flex items-center gap-3 rounded px-2 py-2 hover:bg-white/10 transition-colors ${
                  (params as { userId?: string })?.userId === member.userId ? 'bg-white/10' : ''
                }`}
              >
                <div className="flex-shrink-0 w-8 h-8 relative">
                  <DefaultAvatar
                    userId={member.userId}
                    name={member.userName}
                    className="w-full h-full rounded-sm text-xs"
                  />
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#3F0E40] ${
                    member.status === 'ONLINE' ? 'bg-green-500' :
                    member.status === 'AWAY' ? 'bg-yellow-500' :
                    member.status === 'BUSY' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
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