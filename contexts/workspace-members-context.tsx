'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { pusherClient } from '@/lib/pusher';
import { EVENTS, MemberUpdateEvent } from '@/lib/pusher-events';

interface Member {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  status: string;
  role: string;
  hasCustomName: boolean;
  hasCustomImage: boolean;
  workspaceId: string;
  autoResponseEnabled: boolean;
  voiceResponseEnabled: boolean;
  selectedVoiceId: string | null;
}

interface WorkspaceMembersContextType {
  members: Member[];
  currentMember: Member | null;
  isLoading: boolean;
  error: Error | null;
  updateMember: (memberId: string, updates: Partial<Member>) => Promise<void>;
  refetchMembers: () => Promise<void>;
  clearError: () => void;
}

const WorkspaceMembersContext = createContext<WorkspaceMembersContextType | null>(null);

export function WorkspaceMembersProvider({
  workspaceId,
  children
}: {
  workspaceId: string;
  children: React.ReactNode;
}) {
  const { userId } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetchMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      
      const data = await response.json();
      setMembers(data);
      
      const current = data.find((member: Member) => member.userId === userId);
      if (current) {
        setCurrentMember(current);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateMember = async (memberId: string, updates: Partial<Member>) => {
    try {
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update member');

      const updatedMember = await response.json();
      
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, ...updatedMember } : member
      ));

      if (memberId === currentMember?.id) {
        setCurrentMember(prev => prev ? { ...prev, ...updatedMember } : prev);
      }
    } catch (err) {
      console.error('Failed to update member:', err);
      setError(err as Error);
    }
  };

  useEffect(() => {
    refetchMembers();

    // Subscribe to member updates
    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
    
    channel.bind(EVENTS.MEMBER_UPDATE, (event: MemberUpdateEvent) => {
      const { memberId, updates } = event;
      
      setMembers(prev => prev.map(member => 
        member.id === memberId ? { ...member, ...updates } : member
      ));

      if (memberId === currentMember?.id) {
        setCurrentMember(prev => prev ? { ...prev, ...updates } : prev);
      }
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, userId]);

  const clearError = () => setError(null);

  return (
    <WorkspaceMembersContext.Provider value={{
      members,
      currentMember,
      isLoading,
      error,
      updateMember,
      refetchMembers,
      clearError
    }}>
      {children}
    </WorkspaceMembersContext.Provider>
  );
}

export const useWorkspaceMembers = () => {
  const context = useContext(WorkspaceMembersContext);
  if (!context) {
    throw new Error('useWorkspaceMembers must be used within a WorkspaceMembersProvider');
  }
  return context;
}; 