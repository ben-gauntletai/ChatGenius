"use client";

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Hash, MessageSquare, Trash2, Plus, LogOut } from 'lucide-react'
import { useClerk } from "@clerk/nextjs"
import MemberList from '@/components/workspace/member-list'
import AddChannelModal from '@/components/modals/add-channel-modal'
import DeleteChannelModal from '@/components/modals/delete-channel-modal'
import DirectMessageList from '@/components/workspace/direct-message-list'
import StatusDropdown from '@/components/status-dropdown'

interface Channel {
  id: string
  name: string
}

export default function MainLayout({
  children
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const [channels, setChannels] = useState<Channel[]>([])
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null)
  const [isChannelListExpanded, setIsChannelListExpanded] = useState(true)

  const handleChannelAdded = async () => {
    setShowAddChannel(false)
    const response = await fetch(`/api/workspaces/${params.workspaceId}/channels`)
    const data = await response.json()
    setChannels(data)
  }

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return

    try {
      const response = await fetch(
        `/api/workspaces/${params.workspaceId}/channels/${channelToDelete.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete channel')

      // Refresh channels list
      const channelsResponse = await fetch(`/api/workspaces/${params.workspaceId}/channels`)
      const data = await channelsResponse.json()
      setChannels(data)

      // If we're on the deleted channel's page, redirect to the first available channel
      if (pathname === `/${params.workspaceId}/${channelToDelete.id}` && data.length > 0) {
        router.push(`/${params.workspaceId}/${data[0].id}`)
      }
    } catch (error) {
      console.error('Error deleting channel:', error)
    }
  }

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch(`/api/workspaces/${params.workspaceId}/channels`)
        const data = await response.json()
        setChannels(data)
      } catch (error) {
        console.error('Error fetching channels:', error)
      }
    }

    if (params.workspaceId) {
      fetchChannels()
    }
  }, [params.workspaceId])

  return (
    <div className="flex h-screen">
      <div className="w-60 bg-[#3F0E40] text-white flex flex-col">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-white font-bold text-lg">Your Workspace</h1>
          <div className="mt-2">
            <StatusDropdown workspaceId={params.workspaceId as string} />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div className="px-4 mb-6">
            <button
              onClick={() => setIsChannelListExpanded(!isChannelListExpanded)}
              className="flex items-center mb-2 text-gray-300 hover:text-white w-full"
            >
              <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${isChannelListExpanded ? '' : '-rotate-90'}`} />
              <span>Channels</span>
            </button>
            
            {isChannelListExpanded && (
              <div className="space-y-1">
                {channels.map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/${params.workspaceId}/${channel.id}`}
                    className={`group flex items-center px-2 py-1 rounded hover:bg-[#4A154B] text-gray-300 hover:text-white ${
                      pathname === `/${params.workspaceId}/${channel.id}` ? 'bg-[#4A154B] text-white' : ''
                    }`}
                  >
                    <div className="flex-1 flex items-center">
                      <Hash className="h-4 w-4 mr-2" />
                      <span>{channel.name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setChannelToDelete(channel);
                      }}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-gray-300 group-hover:text-white" />
                    </button>
                  </Link>
                ))}
                
                <button
                  onClick={() => setShowAddChannel(true)}
                  className="flex items-center px-2 py-1 w-full text-gray-300 hover:text-white hover:bg-[#4A154B] rounded"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Add channels</span>
                </button>
              </div>
            )}
          </div>

          {params.workspaceId && (
            <DirectMessageList workspaceId={params.workspaceId as string} />
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => signOut()}
            className="w-full flex items-center text-white/70 hover:text-white/90"
          >
            <LogOut className="h-5 w-5 mr-2" />
            Sign out
          </button>
        </div>
      </div>

      {children}

      {showAddChannel && (
        <AddChannelModal
          isOpen={showAddChannel}
          workspaceId={params.workspaceId as string}
          onClose={() => setShowAddChannel(false)}
          onChannelCreated={handleChannelAdded}
        />
      )}

      <DeleteChannelModal
        isOpen={!!channelToDelete}
        channelName={channelToDelete?.name || ''}
        onClose={() => setChannelToDelete(null)}
        onConfirm={handleDeleteChannel}
      />
    </div>
  )
}
