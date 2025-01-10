'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useWorkspaceMembers } from '@/contexts/workspace-members-context';

const statuses = [
  { id: 'ONLINE', label: 'Active', color: 'bg-green-500' },
  { id: 'AWAY', label: 'Away', color: 'bg-yellow-500' },
  { id: 'BUSY', label: 'Busy', color: 'bg-red-500' },
  { id: 'OFFLINE', label: 'Offline', color: 'bg-gray-500' }
];

export default function StatusDropdown({ 
  workspaceId
}: { 
  workspaceId: string;
}) {
  const { currentMember, updateMember } = useWorkspaceMembers();
  const [isOpen, setIsOpen] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!currentMember) return;
    
    try {
      await updateMember(currentMember.id, { status: newStatus });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  if (!currentMember) {
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
          currentMember.status === 'ONLINE' ? 'bg-green-500' :
          currentMember.status === 'AWAY' ? 'bg-yellow-500' :
          currentMember.status === 'BUSY' ? 'bg-red-500' :
          'bg-gray-500'
        }`} />
        <span className="text-sm">
          {statuses.find(s => s.id === currentMember.status)?.label ?? 'Loading...'}
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
              {currentMember.status === s.id && (
                <Check className="w-4 h-4 ml-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 