'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, MessageSquare } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';
import { useAuth } from '@clerk/nextjs';
import { useWorkspaceMembers } from '@/contexts/workspace-members-context';

export default function DirectMessageList({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const { userId: currentUserId } = useAuth();
  const { members, isLoading } = useWorkspaceMembers();
  const [isExpanded, setIsExpanded] = useState(true);

  const getDisplayName = (member: any) => {
    return member.userId === currentUserId ? `${member.userName} (Me)` : member.userName;
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
                key={member.id}
                onClick={() => router.push(`/${workspaceId}/dm/${member.userId}`)}
                className="w-full flex items-center gap-3 rounded px-2 py-2 hover:bg-[#4A154B] transition-colors"
              >
                <div className="relative">
                  <div className="w-8 h-8 relative rounded-sm overflow-hidden">
                    {member.userImage ? (
                      <img
                        src={member.userImage}
                        alt={getDisplayName(member)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <DefaultAvatar
                        userId={member.userId}
                        name={getDisplayName(member)}
                        className="w-full h-full rounded-sm text-xs"
                      />
                    )}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#3F0E40] ${
                    member.status === 'ONLINE' ? 'bg-green-500' :
                    member.status === 'AWAY' ? 'bg-yellow-500' :
                    member.status === 'BUSY' ? 'bg-red-500' :
                    'bg-gray-500'
                  }`} />
                </div>
                <span className="text-white/70 text-sm truncate">{getDisplayName(member)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
} 