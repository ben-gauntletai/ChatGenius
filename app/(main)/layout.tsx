"use client";

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Hash, MessageSquare, Trash2, Plus, LogOut, Search } from 'lucide-react'
import { useClerk, useAuth } from "@clerk/nextjs"
import useSWR from 'swr'
import MemberList from '@/components/workspace/member-list'
import AddChannelModal from '@/components/modals/add-channel-modal'
import DeleteChannelModal from '@/components/modals/delete-channel-modal'
import DirectMessageList from '@/components/workspace/direct-message-list'
import StatusDropdown from '@/components/status-dropdown'
import SearchDropdown from '@/components/search/search-dropdown'
import UserProfile from '@/components/layout/sidebar/user-profile'
import { WorkspaceMembersProvider } from '@/contexts/workspace-members-context'
import { pusherClient } from '@/lib/pusher'
import { EVENTS, ChannelEvent } from '@/lib/pusher-events'

interface Channel {
  id: string
  name: string
}

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function MainLayout({
  children
}: {
  children: React.ReactNode
}) {
  const params = useParams() as { workspaceId: string };
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useClerk()
  const { userId } = useAuth()
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [channelToDelete, setChannelToDelete] = useState<Channel | null>(null)
  const [isChannelListExpanded, setIsChannelListExpanded] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [showSearchDropdown, setShowSearchDropdown] = useState(false)

  // Use SWR to fetch and automatically revalidate channels
  const { data: channels = [], mutate } = useSWR<Channel[]>(
    `/api/workspaces/${params.workspaceId}/channels`,
    fetcher,
    {
      refreshInterval: 1000, // Poll every second
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  )

  const handleChannelAdded = () => {
    setShowAddChannel(false)
    mutate() // Trigger revalidation
  }

  const handleDeleteChannel = async () => {
    if (!channelToDelete) return

    try {
      const response = await fetch(
        `/api/workspaces/${params.workspaceId}/channels/${channelToDelete.id}`,
        { method: 'DELETE' }
      )

      if (!response.ok) throw new Error('Failed to delete channel')

      // If we're on the deleted channel's page, redirect to the first available channel
      if (pathname === `/${params.workspaceId}/${channelToDelete.id}`) {
        const remainingChannels = channels.filter(ch => ch.id !== channelToDelete.id)
        if (remainingChannels.length > 0) {
          router.push(`/${params.workspaceId}/${remainingChannels[0].id}`)
        }
      }

      setChannelToDelete(null)
      mutate() // Trigger revalidation
    } catch (error) {
      console.error('Error deleting channel:', error)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    router.push(`/${params.workspaceId}/search?q=${encodeURIComponent(searchQuery)}`)
  }

  useEffect(() => {
    const searchMessages = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(
          `/api/workspaces/${params.workspaceId}/search?q=${encodeURIComponent(searchQuery)}`
        )
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Search failed')
        }

        const data = await response.json()
        setSearchResults(data)
      } catch (error) {
        console.error('Search error:', error)
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }

    const timeoutId = setTimeout(searchMessages, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery, params.workspaceId])

  // Subscribe to channel events
  useEffect(() => {
    if (!params.workspaceId) return;

    const channel = pusherClient.subscribe(`workspace-${params.workspaceId}`);

    // Handle new channel creation
    const handleChannelCreate = (newChannel: ChannelEvent) => {
      mutate((current = []) => {
        const exists = current.some(ch => ch.id === newChannel.id);
        if (exists) return current;
        return [...current, { id: newChannel.id, name: newChannel.name }];
      }, false);
    };

    // Handle channel deletion
    const handleChannelDelete = (deletedChannel: ChannelEvent) => {
      mutate((current = []) => current.filter(ch => ch.id !== deletedChannel.id), false);
      
      // If we're on the deleted channel's page, redirect to the first available channel
      if (pathname === `/${params.workspaceId}/${deletedChannel.id}`) {
        const remainingChannels = channels.filter(ch => ch.id !== deletedChannel.id)
        if (remainingChannels.length > 0) {
          router.push(`/${params.workspaceId}/${remainingChannels[0].id}`);
        }
      }
    };

    channel.bind(EVENTS.CHANNEL_CREATE, handleChannelCreate);
    channel.bind(EVENTS.CHANNEL_DELETE, handleChannelDelete);

    return () => {
      channel.unbind(EVENTS.CHANNEL_CREATE, handleChannelCreate);
      channel.unbind(EVENTS.CHANNEL_DELETE, handleChannelDelete);
      pusherClient.unsubscribe(`workspace-${params.workspaceId}`);
    };
  }, [params.workspaceId, pathname, router, channels, mutate]);

  return (
    <WorkspaceMembersProvider workspaceId={params.workspaceId}>
      <div className="flex h-screen overflow-hidden">
        <div className="w-72 bg-[#3F0E40] text-white flex flex-col overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h1 className="text-white font-bold text-lg">Your Workspace</h1>
            <div className="mt-2">
              <StatusDropdown workspaceId={params.workspaceId} />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="space-y-4 py-4">
              <div className="px-4 mb-6">
                <button
                  onClick={() => setIsChannelListExpanded(!isChannelListExpanded)}
                  className="flex items-center mb-2 text-gray-300 hover:text-white w-full"
                >
                  <ChevronDown className={`h-4 w-4 mr-1 transition-transform ${isChannelListExpanded ? '' : '-rotate-90'}`} />
                  <span>Channels</span>
                </button>
                
                {isChannelListExpanded && (
                  <div className="space-y-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {channels?.map((channel) => (
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
                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                  <DirectMessageList workspaceId={params.workspaceId} />
                </div>
              )}
            </div>
          </div>

          <div className="p-4">
            <UserProfile 
              workspaceId={params.workspaceId} 
              onSignOut={() => signOut()} 
            />
          </div>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-20 border-b flex items-center px-4 bg-white">
            <div className="max-w-3xl w-full mx-auto relative">
              <form onSubmit={handleSearch} className="w-full">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      setShowSearchDropdown(true)
                    }}
                    onFocus={() => setShowSearchDropdown(true)}
                    placeholder="Search messages..."
                    className="w-full bg-gray-100 text-gray-900 placeholder-gray-500 text-sm rounded px-3 py-3 pl-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Search className="h-4 w-4 text-gray-400 absolute left-2 top-3.5" />
                </div>
              </form>
              {showSearchDropdown && searchQuery.trim() && (
                <SearchDropdown
                  results={searchResults}
                  isLoading={isSearching}
                  onClose={() => setShowSearchDropdown(false)}
                />
              )}
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
            {children}
          </div>
        </div>

        {showAddChannel && (
          <AddChannelModal
            isOpen={showAddChannel}
            workspaceId={params.workspaceId}
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
    </WorkspaceMembersProvider>
  )
}
