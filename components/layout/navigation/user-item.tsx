'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserButton } from '@clerk/nextjs'
import { useParams } from 'next/navigation'
import StatusDropdown from '@/components/status-dropdown'

export default function UserItem() {
  const params = useParams()
  const workspaceId = params.workspaceId as string

  return (
    <div className="flex items-center gap-2">
      <StatusDropdown workspaceId={workspaceId} />
      <DropdownMenu>
        <DropdownMenuTrigger>
          <UserButton afterSignOutUrl="/" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <UserButton afterSignOutUrl="/" showName />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 