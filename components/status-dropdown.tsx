'use client';

import { useState, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';

const statuses = [
  { id: 'ONLINE', label: 'Active', color: 'bg-green-500' },
  { id: 'AWAY', label: 'Away', color: 'bg-yellow-500' },
  { id: 'BUSY', label: 'Busy', color: 'bg-red-500' },
  { id: 'OFFLINE', label: 'Offline', color: 'bg-gray-500' }
];

export default function StatusDropdown({ 
  workspaceId,
  currentStatus
}: { 
  workspaceId: string;
  currentStatus?: string;
}) {
  const { userId } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      if (!workspaceId || !userId) return;
      
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/members`);
        const members = await response.json();
        const currentMember = members.find((m: any) => m.userId === userId);
        
        if (currentMember?.status) {
          setStatus(currentMember.status);
        }
      } catch (error) {
        console.error('Failed to fetch status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [workspaceId, userId]);

  // Update local state when prop changes
  useEffect(() => {
    if (currentStatus && !isLoading) {
      setStatus(currentStatus);
    }
  }, [currentStatus, isLoading]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setStatus(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (isLoading || !status) {
    return (
      <div className="flex items-center gap-2 px-3 py-1">
        <div className="w-2 h-2 rounded-full bg-gray-500 animate-pulse" />
        <span className="text-sm text-white/70">Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 rounded hover:bg-[#4A154B] text-white/70 hover:text-white"
      >
        <div className={`w-2 h-2 rounded-full ${
          status === 'ONLINE' ? 'bg-green-500' :
          status === 'AWAY' ? 'bg-yellow-500' :
          status === 'BUSY' ? 'bg-red-500' :
          'bg-gray-500'
        }`} />
        <span className="text-sm">
          {statuses.find(s => s.id === status)?.label ?? 'Loading...'}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-[#1A1D21] rounded-md shadow-lg border border-white/10">
          {statuses.map((s) => (
            <button
              key={s.id}
              onClick={() => handleStatusChange(s.id)}
              className="flex items-center w-full px-4 py-2 text-sm text-white/70 hover:bg-[#4A154B] hover:text-white"
            >
              <div className={`w-2 h-2 rounded-full mr-2 ${s.color}`} />
              {s.label}
              {status === s.id && (
                <Check className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 