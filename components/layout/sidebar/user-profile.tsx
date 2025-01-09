import { useState, useEffect } from 'react';
import { useAuth, useUser } from '@clerk/nextjs';
import { LogOut } from 'lucide-react';
import DefaultAvatar from '@/components/ui/default-avatar';
import ProfileModal from '@/components/modals/profile-modal';
import { pusherClient } from '@/lib/pusher';

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
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user?.fullName || 'User');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
    
    channel.bind('profile-update', (data: {
      userId: string;
      name: string;
      imageUrl: string | null;
      statusText: string;
    }) => {
      if (data.userId === userId) {
        setDisplayName(data.name);
        setProfileImage(data.imageUrl);
        setStatusText(data.statusText);
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

  const handleNameChange = async (newName: string) => {
    setDisplayName(newName);
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
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <DefaultAvatar
                  userId={userId || ''}
                  name={displayName}
                  className="w-full h-full text-sm"
                />
              )}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#3F0E40] ${getStatusColor(status)}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate">
              {displayName}
            </p>
            <p className="text-sm text-white/70 truncate">
              {statusText}
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

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={userId || ''}
        userName={displayName}
        status={status}
        statusText={statusText}
        onStatusTextChange={setStatusText}
        onNameChange={handleNameChange}
        workspaceId={workspaceId}
      />
    </>
  );
} 