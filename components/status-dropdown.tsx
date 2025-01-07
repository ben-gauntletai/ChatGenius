'use client';

import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const statuses = [
  { id: 'Online', label: 'Online' },
  { id: 'Away', label: 'Away' },
  { id: 'Busy', label: 'Busy' },
  { id: 'Offline', label: 'Offline' }
];

export default function StatusDropdown({ 
  workspaceId,
  currentStatus = 'Online'
}: { 
  workspaceId: string;
  currentStatus?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);

  const handleStatusChange = async (newStatus: string) => {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      setStatus(newStatus);
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 rounded hover:bg-[#4A154B] text-white/70 hover:text-white"
      >
        <div className={`w-2 h-2 rounded-full ${
          status === 'Online' ? 'bg-green-500' :
          status === 'Away' ? 'bg-yellow-500' :
          status === 'Busy' ? 'bg-red-500' :
          'bg-gray-500'
        }`} />
        <span className="text-sm">{status}</span>
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
              <div className={`w-2 h-2 rounded-full mr-2 ${
                s.id === 'Online' ? 'bg-green-500' :
                s.id === 'Away' ? 'bg-yellow-500' :
                s.id === 'Busy' ? 'bg-red-500' :
                'bg-gray-500'
              }`} />
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