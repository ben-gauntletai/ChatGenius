import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import MessageList from '@/components/layout/main-content/message-list';
import DirectMessageHeader from '@/components/layout/main-content/direct-message-header';

export default async function DirectMessagePage({
  params
}: {
  params: { workspaceId: string; userId: string }
}) {
  const { userId: currentUserId } = auth();
  if (!currentUserId) redirect('/sign-in');

  // Fetch the other user's details
  const otherUser = await prisma.workspaceMember.findFirst({
    where: { 
      userId: params.userId,
      workspaceId: params.workspaceId
    }
  });

  if (!otherUser) {
    redirect(`/${params.workspaceId}`);
  }

  // ... rest of the component stays the same ...
} 