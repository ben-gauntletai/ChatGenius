"use client";

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import StatusDropdown from '@/components/status-dropdown';
import { useParams } from 'next/navigation';

interface WorkspaceHeaderProps {
  name: string;
}

export default function WorkspaceHeader({ name }: WorkspaceHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  return (
    <div className="p-4 border-b border-gray-700">
      <button 
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center justify-between w-full hover:bg-gray-700 p-2 rounded"
      >
        <span className="font-semibold">{name}</span>
        <ChevronDown className="w-4 h-4" />
      </button>
      
      {/* Add StatusDropdown below the workspace name */}
      <div className="mt-2 px-2">
        <StatusDropdown workspaceId={workspaceId} />
      </div>
    </div>
  );
} 