'use client';

import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';
import { pusherClient } from '@/lib/pusher';
import { useAuth } from '@clerk/nextjs';

interface DirectMessageHeaderProps {
  userId: string;
  userName: string;
  status: string;
  workspaceId: string;
}

export default function DirectMessageHeader({ userId, userName: initialUserName, status, workspaceId }: DirectMessageHeaderProps) {
  const { userId: currentUserId } = useAuth();
  const [userName, setUserName] = useState(initialUserName);

  useEffect(() => {
    if (!workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
    
    channel.bind('profile-update', (data: {
      userId: string;
      name: string;
    }) => {
      if (data.userId === userId) {
        setUserName(data.name);
      }
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, userId]);

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
    return userId === currentUserId ? `${userName} (Me)` : userName;
  };

  return (
    <div className="h-14 border-b flex items-center px-4 gap-3">
      <div className="relative w-6 h-6">
        <DefaultAvatar
          userId={userId}
          name={userName}
          className="w-full h-full rounded-sm text-xs"
        />
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(status)}`} />
      </div>
      <span className="font-medium">{getDisplayName()}</span>
    </div>
  );
} 