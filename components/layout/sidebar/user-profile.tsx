'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';
import ProfileModal from '@/components/modals/profile-modal';
import { useWorkspaceMembers } from '@/contexts/workspace-members-context';

interface UserProfileProps {
  workspaceId: string;
  onSignOut: () => void;
}

export default function UserProfile({ workspaceId, onSignOut }: UserProfileProps) {
  const { userId } = useAuth();
  const { currentMember } = useWorkspaceMembers();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!currentMember) {
    return null;
  }

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

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  return (
    <>
      <div className="p-2">
        <div 
          className="flex items-center gap-3 mb-3 cursor-pointer hover:bg-[#4A154B] p-2 rounded-md transition"
          onClick={() => setIsProfileModalOpen(true)}
        >
          <div className="relative">
            <div className="w-10 h-10 relative rounded-sm overflow-hidden">
              {currentMember.hasCustomImage && currentMember.userImage ? (
                <div className="w-full h-full relative">
                  <img
                    src={currentMember.userImage}
                    alt={currentMember.userName}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
              ) : (
                <DefaultAvatar
                  userId={userId || ''}
                  name={currentMember.userName}
                  className="w-full h-full text-sm"
                />
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#3F0E40] ${getStatusColor(currentMember.status)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">
              {currentMember.userName}
            </p>
            <p className="text-sm text-white/70 truncate">
              {formatStatus(currentMember.status)}
            </p>
          </div>
        </div>
        <div className="h-px bg-white/10 my-3 -mx-2" />
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 text-white/70 hover:text-white/90 text-sm py-1 px-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      {isProfileModalOpen && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentImage={currentMember.userImage || undefined}
          hasCustomImage={currentMember.hasCustomImage}
          isFirstLogin={false}
        />
      )}
    </>
  );
} 