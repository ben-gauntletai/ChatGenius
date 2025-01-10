'use client';

import { useEffect, useState } from 'react';
import { redirect } from 'next/navigation';
import ProfileModal from '@/components/modals/profile-modal';
import { getWorkspaceData } from './actions';

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
          currentImage={member.userImage}
          hasCustomImage={member.hasCustomImage}
          isFirstLogin={true}
        />
      )}
      {children}
    </>
  );
} 