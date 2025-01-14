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
  const [isSaving, setIsSaving] = useState(false);

  const refetchMembers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (!response.ok) throw new Error('Failed to fetch members');
      
      const data = await response.json();
      console.log('Fetched members data:', data.map((m: Member) => ({
        id: m.id,
        userName: m.userName,
        autoResponseEnabled: m.autoResponseEnabled
      })));
      
      // Only update state if we're not in the middle of a save operation
      if (!isSaving) {
        setMembers(data);
        
        if (userId) {
          const member = data.find((m: Member) => m.userId === userId);
          setCurrentMember(member || null);
        }
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
      setIsSaving(true);
      console.log('Starting member update:', { memberId, updates });
      
      // Optimistic update
      setMembers(current => {
        const newMembers = current.map(member =>
          member.id === memberId
            ? { ...member, ...updates }
            : member
        );
        console.log('Updated members state:', newMembers.map(m => ({
          id: m.id,
          autoResponseEnabled: m.autoResponseEnabled
        })));
        return newMembers;
      });

      if (currentMember?.id === memberId) {
        setCurrentMember(current => {
          const newMember = current ? { ...current, ...updates } : null;
          console.log('Updated current member:', newMember);
          return newMember;
        });
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

      const updatedMember = await response.json();
      console.log('Server response:', updatedMember);

      // Update state with server response
      setMembers(current =>
        current.map(member =>
          member.id === memberId
            ? { ...member, ...updatedMember }
            : member
        )
      );

      if (currentMember?.id === memberId) {
        setCurrentMember(current =>
          current ? { ...current, ...updatedMember } : null
        );
      }
    } catch (error) {
      console.error('Update member error:', error);
      await refetchMembers();
      setError(error instanceof Error ? error : new Error('Failed to update member'));
    } finally {
      setIsSaving(false);
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
      console.log('Received Pusher member update:', data);
      
      setMembers(current => {
        const newMembers = current.map(member =>
          member.id === data.id
            ? { ...member, ...data }
            : member
        );
        console.log('Updated members from Pusher:', newMembers.map(m => ({
          id: m.id,
          autoResponseEnabled: m.autoResponseEnabled
        })));
        return newMembers;
      });

      // Use callback ref to get latest currentMember value
      setCurrentMember(current => {
        if (current?.id === data.id) {
          const newMember = { ...current, ...data };
          console.log('Updated current member from Pusher:', newMember);
          return newMember;
        }
        return current;
      });
    });

    return () => {
      console.log('Unsubscribing from Pusher channel:', `workspace-${workspaceId}`);
      pusherClient.unsubscribe(`workspace-${workspaceId}`);
    };
  }, [workspaceId]); // Remove currentMember from dependencies

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