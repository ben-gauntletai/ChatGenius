"use client";

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import StatusDropdown from '@/components/status-dropdown';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface Member {
  userId: string;
  status: string;
  statusUpdatedAt: string;
}

interface WorkspaceHeaderProps {
  name: string;
}

export default function WorkspaceHeader({ name }: WorkspaceHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const params = useParams();
  const { userId } = useAuth();
  const workspaceId = params.workspaceId as string;

  useEffect(() => {
    const fetchStatus = async () => {
      if (!workspaceId || !userId) return;

      try {
        setIsLoading(true);
        console.log('Fetching status - WorkspaceHeader:', { workspaceId, userId });
        
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }

        const members = await response.json();
        console.log('WorkspaceHeader - All members:', members);
        
        const currentMember = members.find(m => m.userId === userId);
        console.log('WorkspaceHeader - Current member:', currentMember);
        
        if (currentMember?.status) {
          console.log('WorkspaceHeader - Setting status to:', currentMember.status);
          setCurrentStatus(currentMember.status);
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [workspaceId, userId]);

  if (isLoading || !currentStatus) {
    return (
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between w-full p-2">
          <span className="font-semibold">{name}</span>
          <div className="animate-pulse w-4 h-4 bg-gray-600 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-700">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center justify-between w-full hover:bg-gray-700 p-2 rounded"
      >
        <span className="font-semibold">{name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      
      <div className="mt-2 px-2">
        <StatusDropdown 
          key={currentStatus}
          workspaceId={workspaceId} 
          currentStatus={currentStatus}
        />
      </div>
    </div>
  );
} 