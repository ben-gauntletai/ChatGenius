"use client";

import { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import StatusDropdown from '@/components/status-dropdown';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface Member {
  userId: string;
  status: string;
}

interface WorkspaceHeaderProps {
  name: string;
}

export default function WorkspaceHeader({ name }: WorkspaceHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const params = useParams() as { workspaceId: string };
  const workspaceId = params.workspaceId;

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
        <StatusDropdown workspaceId={workspaceId} />
      </div>
    </div>
  );
} 