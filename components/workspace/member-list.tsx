'use client';

import { useState } from 'react';
import { ChevronDown, Users, Loader2 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import DefaultAvatar from '@/components/ui/default-avatar';
import { useWorkspaceMembers } from '@/contexts/workspace-members-context';

export default function MemberList({ workspaceId }: { workspaceId: string }) {
  const { userId } = useAuth();
  const { members, isLoading } = useWorkspaceMembers();
  const [isExpanded, setIsExpanded] = useState(true);

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
                  {member.hasCustomImage && member.userImage ? (
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