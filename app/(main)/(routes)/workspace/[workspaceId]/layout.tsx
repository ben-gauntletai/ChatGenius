'use client'

import { WorkspaceMembersProvider } from '@/contexts/workspace-members-context'
import { MessageProvider } from '@/contexts/message-context'
import { PusherProvider } from '@/contexts/pusher-context'

export default function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  return (
    <WorkspaceMembersProvider workspaceId={params.workspaceId}>
      <MessageProvider>
        <PusherProvider>
          {children}
        </PusherProvider>
      </MessageProvider>
    </WorkspaceMembersProvider>
  )
} 