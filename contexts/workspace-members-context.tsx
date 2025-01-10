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
      
      if (userId) {
        const member = data.find((m: Member) => m.userId === userId);
        setCurrentMember(member || null);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      setError(error instanceof Error ? error : new Error('Failed to fetch members'));
    } finally {
      setIsLoading(false);
    }
  };

  const updateMember = async (memberId: string, updates: Partial<Member>) => {
    try {
      // Optimistic update
      setMembers(current => 
        current.map(member =>
          member.id === memberId
            ? { ...member, ...updates }
            : member
        )
      );

      if (currentMember?.id === memberId) {
        setCurrentMember(current => 
          current ? { ...current, ...updates } : null
        );
      }

      // API call
      const response = await fetch('/api/profile/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error('Failed to update member');
      }
    } catch (error) {
      // On failure, refetch to ensure consistency
      await refetchMembers();
      setError(error instanceof Error ? error : new Error('Failed to update member'));
    }
  };

  const clearError = () => setError(null);

  // Initial fetch
  useEffect(() => {
    if (workspaceId) {
      refetchMembers();
    }
  }, [workspaceId, userId]);

  // Subscribe to Pusher events
  useEffect(() => {
    if (!workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${workspaceId}`);
    
    channel.bind(EVENTS.MEMBER_UPDATE, (data: MemberUpdateEvent) => {
      setMembers(current =>
        current.map(member =>
          member.id === data.id
            ? { ...member, ...data }
            : member
        )
      );

      if (currentMember?.id === data.id) {
        setCurrentMember(current =>
          current ? { ...current, ...data } : null
        );
      }
    });

    return () => {
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId, currentMember]);

  return (
    <WorkspaceMembersContext.Provider
      value={{
        members,
        currentMember,
        isLoading,
        error,
        updateMember,
        refetchMembers,
        clearError
      }}
    >
      {children}
    </WorkspaceMembersContext.Provider>
  );
}

export function useWorkspaceMembers() {
  const context = useContext(WorkspaceMembersContext);
  if (!context) {
    throw new Error('useWorkspaceMembers must be used within a WorkspaceMembersProvider');
  }
  return context;
} 