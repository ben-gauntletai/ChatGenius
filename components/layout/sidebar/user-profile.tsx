import { useState } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';

interface UserProfileProps {
  workspaceId: string;
  status: string;
  onSignOut: () => void;
}

export default function UserProfile({ workspaceId, status, onSignOut }: UserProfileProps) {
  const { userId } = useAuth();
  const { user } = useUser();
  const [isEditing, setIsEditing] = useState(false);
  const [statusText, setStatusText] = useState("What's on your mind?");

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
    <div className="p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="relative">
          <div className="w-10 h-10 relative rounded-sm overflow-hidden">
            <DefaultAvatar
              userId={userId || ''}
              name={user?.fullName || 'User'}
              className="w-full h-full text-sm"
            />
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#3F0E40] ${getStatusColor(status)}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium truncate">
            {user?.fullName || 'User'}
          </p>
          {isEditing ? (
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditing(false);
                }
              }}
              className="w-full bg-transparent text-sm text-white/70 focus:outline-none"
              autoFocus
            />
          ) : (
            <p 
              onClick={() => setIsEditing(true)}
              className="text-sm text-white/70 truncate cursor-pointer hover:text-white/90"
            >
              {statusText}
            </p>
          )}
        </div>
      </div>
      <div className="h-px bg-white/10 my-3 -mx-4" />
      <button
        onClick={onSignOut}
        className="w-full flex items-center gap-2 text-white/70 hover:text-white/90 text-sm py-1"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
} 