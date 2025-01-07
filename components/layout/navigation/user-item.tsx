'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UserButton } from '@clerk/nextjs'

export default function UserItem() {
  return (
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
  )
} 