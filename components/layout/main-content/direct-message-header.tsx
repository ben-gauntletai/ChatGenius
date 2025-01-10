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
  userImage?: string | null;
}

export default function DirectMessageHeader({ 
  userId, 
  userName: initialUserName, 
  status, 
  workspaceId,
  userImage: initialUserImage 
}: DirectMessageHeaderProps) {
  const { userId: currentUserId } = useAuth();
  const [userName, setUserName] = useState(initialUserName);
  const [userImage, setUserImage] = useState(initialUserImage);
  const [hasCustomName, setHasCustomName] = useState(false);
  const [hasCustomImage, setHasCustomImage] = useState(false);

  // Fetch current member data
  useEffect(() => {
    const fetchMemberData = async () => {
      if (!workspaceId || !userId) return;

      try {
        console.log('Fetching member data for:', { userId, workspaceId });
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!response.ok) throw new Error('Failed to fetch members');
        
        const members = await response.json();
        const currentMember = members.find((m: any) => m.userId === userId);
        
        if (currentMember) {
          console.log('Found current member in header:', currentMember);
          setHasCustomName(currentMember.hasCustomName || false);
          setHasCustomImage(currentMember.hasCustomImage || false);
          setUserName(currentMember.hasCustomName ? currentMember.userName : 'User');
          setUserImage(currentMember.hasCustomImage && currentMember.userImage?.startsWith('/api/files/') ? currentMember.userImage : null);
        } else {
          setUserName('User');
          setUserImage(null);
          setHasCustomName(false);
          setHasCustomImage(false);
        }
      } catch (error) {
        console.error('Failed to fetch member data:', error);
        setUserName('User');
        setUserImage(null);
        setHasCustomName(false);
        setHasCustomImage(false);
      }
    };

    fetchMemberData();
  }, [workspaceId, userId]);

  // Update when initial props change
  useEffect(() => {
    // Don't update from initial props anymore since we're using the member data
  }, []);

  // Listen for profile updates
  useEffect(() => {
    if (!workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
    
    channel.bind('profile-update', (data: {
      userId: string;
      name: string;
      imageUrl: string | null;
      hasCustomName: boolean;
      hasCustomImage: boolean;
    }) => {
      if (data.userId === userId) {
        console.log('Received profile update in header:', data);
        console.log('Current userImage:', userImage);
        console.log('New imageUrl:', data.imageUrl);
        setHasCustomName(data.hasCustomName || false);
        setHasCustomImage(data.hasCustomImage || false);
        setUserName(data.hasCustomName ? data.name : 'User');
        setUserImage(data.hasCustomImage && data.imageUrl?.startsWith('/api/files/') ? data.imageUrl : null);
      }
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, userId]);

  // Log state changes
  useEffect(() => {
    console.log('DirectMessageHeader state updated:', { userName, userImage, hasCustomName, hasCustomImage });
  }, [userName, userImage, hasCustomName, hasCustomImage]);

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
    const name = hasCustomName ? userName : 'User';
    return userId === currentUserId ? `${name} (Me)` : name;
  };

  return (
    <div className="h-14 border-b flex items-center px-4 gap-3">
      <div className="relative w-6 h-6">
        {hasCustomImage && userImage?.startsWith('/api/files/') ? (
          <div className="w-full h-full relative rounded-sm overflow-hidden">
            <img
              src={userImage}
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
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(status)}`} />
      </div>
      <span className="font-medium">{getDisplayName()}</span>
    </div>
  );
} 