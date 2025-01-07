"use client";

import { useState, useEffect } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Hash, MessageSquare, Trash2, Plus, LogOut } from 'lucide-react'
import { useClerk, SignOutButton } from "@clerk/nextjs"
import MemberList from '@/components/workspace/member-list'
import DirectMessageList from '@/components/workspace/direct-message-list'
import AddChannelModal from '@/components/modals/add-channel-modal'
import DeleteChannelModal from '@/components/modals/delete-channel-modal'

interface Channel {
  id: string
  name: string
}

export default function MainLayout({
  children
}: {
  children: React.ReactNode
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isAddChannelModalOpen, setIsAddChannelModalOpen] = useState(false);
  const [deleteChannel, setDeleteChannel] = useState<Channel | null>(null);
  const [isChannelsExpanded, setIsChannelsExpanded] = useState(true);
  const workspaceId = params.workspaceId as string;

  const fetchChannels = async () => {
    if (!workspaceId) return;
    
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/channels`, {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Failed to fetch channels');
      const data = await response.json();
      setChannels(data);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [workspaceId]);

  const handleSignOut = () => {
    signOut(() => router.push('/sign-in'));
  };

  const handleChannelAdded = async () => {
    await fetchChannels();
  };

  const handleDeleteChannel = async () => {
    if (!deleteChannel) return;

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/channels/${deleteChannel.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete channel');
      }

      setChannels(channels.filter(channel => channel.id !== deleteChannel.id));
      setDeleteChannel(null);
      
      if (pathname.includes(deleteChannel.id)) {
        // Find another channel to redirect to
        const generalChannel = channels.find(c => c.name === 'general');
        const firstChannel = channels.find(c => c.id !== deleteChannel.id);
        if (generalChannel) {
          router.push(`/${workspaceId}/${generalChannel.id}`);
        } else if (firstChannel) {
          router.push(`/${workspaceId}/${firstChannel.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <aside className="flex flex-col bg-[#3F0E40] w-60">
        <div className="p-4 border-b border-white/10">
          <span className="text-white font-semibold px-2 py-1">
            Workspace Name
          </span>
        </div>

        <div className="flex flex-col min-h-0 flex-1">
          <div className="flex-1 overflow-y-auto">
            <div className="mt-4">
              <button 
                onClick={() => setIsChannelsExpanded(!isChannelsExpanded)}
                className="w-full flex items-center px-4 mb-2 group"
              >
                <ChevronDown 
                  className={`w-3 h-3 text-white/70 mr-1 transition-transform ${
                    isChannelsExpanded ? '' : '-rotate-90'
                  }`}
                />
                <span className="text-[15px] text-white/70">Channels</span>
              </button>

              {isChannelsExpanded && (
                <>
                  {channels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center group px-4 py-[6px] text-[15px] text-white/70 hover:bg-[#350D36]"
                    >
                      <Link
                        href={`/${workspaceId}/${channel.id}`}
                        className="flex items-center flex-1"
                      >
                        <Hash className="w-4 h-4 mr-2" />
                        {channel.name}
                      </Link>
                      <button
                        onClick={() => setDeleteChannel(channel)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#4A154B] rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  <button
                    onClick={() => setIsAddChannelModalOpen(true)}
                    className="w-full text-left px-4 py-1 text-white/70 hover:text-white hover:bg-[#350D36] text-sm flex items-center mt-1"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add channels
                  </button>
                </>
              )}
            </div>
            
            {/* <DirectMessageList workspaceId={workspaceId} /> */}
          </div>

          <div className="border-t border-white/10">
            <MemberList workspaceId={workspaceId} />
            <div className="px-3 py-4">
              <SignOutButton signOutCallback={() => router.push('/')}>
                <button className="flex items-center w-full px-2 py-1 text-white/70 hover:text-white hover:bg-[#350D36] rounded">
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </SignOutButton>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex flex-col bg-white flex-1">
        {children}
      </main>

      <AddChannelModal
        workspaceId={workspaceId}
        isOpen={isAddChannelModalOpen}
        onClose={() => setIsAddChannelModalOpen(false)}
        onChannelAdded={handleChannelAdded}
      />

      <DeleteChannelModal
        isOpen={!!deleteChannel}
        channelName={deleteChannel?.name || ''}
        onClose={() => setDeleteChannel(null)}
        onConfirm={handleDeleteChannel}
      />
    </div>
  );
}
