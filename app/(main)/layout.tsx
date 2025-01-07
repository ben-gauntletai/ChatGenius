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
  const [channels, setChannels] = useState<Channel[]>([])
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [showDeleteChannel, setShowDeleteChannel] = useState(false)
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)
  const [isChannelListExpanded, setIsChannelListExpanded] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const response = await fetch(`/api/workspaces/${params.workspaceId}/channels`)
        const data = await response.json()
        setChannels(data)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to fetch channels:', error)
        setIsLoading(false)
      }
    }

    if (params.workspaceId) {
      fetchChannels()
    }
  }, [params.workspaceId])

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
    </div>
  }

  return (
    <div className="h-screen flex">
      <div className="bg-[#3F0E40] w-60 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-white/10">
          <h1 className="text-white font-bold text-lg">Your Workspace</h1>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          <div>
            <button 
              onClick={() => setIsChannelListExpanded(!isChannelListExpanded)}
              className="w-full flex items-center group px-2 py-[6px]"
            >
              <ChevronDown className={`w-3 h-3 text-white/70 mr-1 transition-transform ${
                isChannelListExpanded ? '' : '-rotate-90'
              }`} />
              <Hash className="w-4 h-4 text-white/70 mr-2" />
              <span className="text-[15px] text-white/70">Channels</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowAddChannel(true)
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 hover:text-white/90"
              >
                <Plus className="w-4 h-4 text-white/70" />
              </button>
            </button>

            {isChannelListExpanded && (
              <div className="mt-1 space-y-[2px]">
                {channels.map((channel) => (
                  <div
                    key={channel.id}
                    className="group flex items-center px-2"
                  >
                    <Link
                      href={`/${params.workspaceId}/${channel.id}`}
                      className={`flex-1 flex items-center px-2 py-[6px] rounded hover:bg-white/10 ${
                        pathname?.includes(channel.id) ? 'bg-white/10' : ''
                      }`}
                    >
                      <Hash className="w-4 h-4 text-white/70 mr-2" />
                      <span className="text-white/70 text-[15px]">
                        {channel.name}
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChannel(channel)
                        setShowDeleteChannel(true)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-white/90"
                    >
                      <Trash2 className="w-4 h-4 text-white/70" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {params.workspaceId && (
            <DirectMessageList workspaceId={params.workspaceId as string} />
          )}
        </div>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => signOut(() => router.push('/sign-in'))}
            className="w-full flex items-center text-white/70 hover:text-white/90"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {children}
      </div>

      {showAddChannel && (
        <AddChannelModal
          workspaceId={params.workspaceId as string}
          onClose={() => setShowAddChannel(false)}
          onChannelAdded={() => {
            setShowAddChannel(false)
            fetchChannels()
          }}
        />
      )}
      {showDeleteChannel && selectedChannel && (
        <DeleteChannelModal
          channel={selectedChannel}
          onClose={() => {
            setShowDeleteChannel(false)
            setSelectedChannel(null)
          }}
          onChannelDeleted={() => {
            setShowDeleteChannel(false)
            setSelectedChannel(null)
            fetchChannels()
          }}
        />
      )}
    </div>
  )
}
