'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronDown, Hash, Plus } from 'lucide-react';

interface Channel {
  id: string;
  name: string;
}

export default function ChannelList({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const params = useParams();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/workspaces/${workspaceId}/channels`);
        const data = await response.json();
        setChannels(data);
      } catch (error) {
        console.error('Failed to fetch channels:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [workspaceId]);

  const handleChannelClick = (channelId: string) => {
    router.push(`/${workspaceId}/${channelId}`);
  };

  return (
    <div className="px-2 mb-4">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center group px-2 py-[6px]"
      >
        <ChevronDown className={`w-3 h-3 text-white/70 mr-1 transition-transform ${
          isExpanded ? '' : '-rotate-90'
        }`} />
        <span className="text-[15px] text-white/70">Channels</span>
      </button>

      {isExpanded && (
        <div className="mt-1 space-y-[2px]">
          {isLoading ? (
            <div className="px-2 py-1 text-white/50 text-sm">Loading...</div>
          ) : (
            channels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => handleChannelClick(channel.id)}
                className={`w-full flex items-center gap-2 rounded px-2 py-[6px] hover:bg-white/10 transition-colors ${
                  params.channelId === channel.id ? 'bg-white/10' : ''
                }`}
              >
                <Hash className="w-4 h-4 text-white/70" />
                <span className="text-white/70 text-[15px]">
                  {channel.name}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
} 