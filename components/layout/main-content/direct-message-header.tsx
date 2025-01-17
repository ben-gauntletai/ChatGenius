'use client';

import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';
import { useAuth } from '@clerk/nextjs';
import { useWorkspaceMembers } from '@/contexts/workspace-members-context';

interface DirectMessageHeaderProps {
  userId: string;
  workspaceId: string;
}

export default function DirectMessageHeader({ 
  userId, 
  workspaceId
}: DirectMessageHeaderProps) {
  const { userId: currentUserId } = useAuth();
  const { members } = useWorkspaceMembers();
  
  const member = members.find(m => m.userId === userId);
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ONLINE':
        return 'bg-green-500';
      case 'AWAY':
        return 'bg-yellow-500';
      case 'BUSY':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getDisplayName = () => {
    if (!member) return 'User';
    return userId === currentUserId ? `${member.userName} (Me)` : member.userName;
  };

  if (!member) {
    return (
      <div className="h-14 border-b flex items-center px-4 gap-3">
        <DefaultAvatar
          userId={userId}
          name="User"
          className="w-6 h-6 rounded-sm text-xs"
        />
        <span className="font-medium">User</span>
      </div>
    );
  }

  return (
    <div className="h-14 border-b flex items-center px-4 gap-3">
      <div className="relative">
        <div className="w-6 h-6 relative rounded-sm overflow-hidden">
          {member.userImage ? (
            <img
              src={member.userImage}
              alt={getDisplayName()}
              className="w-full h-full object-cover"
            />
          ) : (
            <DefaultAvatar
              userId={member.userId}
              name={getDisplayName()}
              className="w-full h-full rounded-sm text-xs"
            />
          )}
        </div>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${getStatusColor(member.status)}`} />
      </div>
      <span className="font-medium">{getDisplayName()}</span>
    </div>
  );
} 