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
    const name = member.hasCustomName ? member.userName : 'User';
    return userId === currentUserId ? `${name} (Me)` : name;
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
      <div className="relative w-6 h-6">
        {member.hasCustomImage && member.userImage?.startsWith('/api/files/') ? (
          <div className="w-full h-full relative rounded-sm overflow-hidden">
            <img
              src={member.userImage}
              alt={getDisplayName()}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <DefaultAvatar
            userId={userId}
            name={getDisplayName()}
            className="w-full h-full rounded-sm text-xs"
          />
        )}
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(member.status)}`} />
      </div>
      <span className="font-medium">{getDisplayName()}</span>
    </div>
  );
} 