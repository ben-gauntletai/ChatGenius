import { useEffect, useState } from 'react';
import { Hash } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';

interface DirectMessageHeaderProps {
  userId: string;
  userName: string;
  status: string;
}

export default function DirectMessageHeader({ userId, userName, status }: DirectMessageHeaderProps) {
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
      <span className="font-medium">{userName}</span>
    </div>
  );
} 