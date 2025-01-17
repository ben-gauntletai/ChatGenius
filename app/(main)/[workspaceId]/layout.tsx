'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import ProfileModal from '@/components/modals/profile-modal';
import { getWorkspaceData } from './actions';
import { WorkspaceMembersProvider } from '@/contexts/workspace-members-context';
import { MessageProvider } from '@/contexts/message-context';
import { PusherProvider } from '@/contexts/pusher-context';

export default function WorkspaceLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { workspaceId: string };
}) {
  const [member, setMember] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    const data = await getWorkspaceData(params.workspaceId);
    if (!data) {
      redirect('/');
    }
    setMember(data.member);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [params.workspaceId]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {member?.isFirstLogin && (
        <ProfileModal 
          isOpen={true}
          onClose={() => loadData()}
          initialProfile={{
            name: member.userName || '',
            image: member.userImage || null,
            autoResponseEnabled: member.autoResponseEnabled || false,
            voiceResponseEnabled: member.voiceResponseEnabled || false,
            selectedVoiceId: member.selectedVoiceId || null
          }}
        />
      )}
      <WorkspaceMembersProvider workspaceId={params.workspaceId}>
        <MessageProvider>
          <PusherProvider>
            {children}
          </PusherProvider>
        </MessageProvider>
      </WorkspaceMembersProvider>
    </>
  );
} 