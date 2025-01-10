'use server';

import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function getWorkspaceData(workspaceId: string) {
  const { userId } = auth();
  
  if (!userId) {
    redirect('/sign-in?message=Please sign in to access workspaces');
  }

  // Check if workspace exists first
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: { members: true }
  });

  if (!workspace) {
    redirect('/sign-in?message=Workspace not found');
  }

  // Find existing member
  const existingMember = await prisma.workspaceMember.findFirst({
    where: {
      userId: userId,
      workspaceId: workspaceId
    }
  });

  // Update member info while preserving status and custom profile
  const updatedMember = await prisma.workspaceMember.upsert({
    where: {
      id: existingMember?.id || ''
    },
    update: {
      ...(existingMember?.status === 'OFFLINE' ? {
        status: existingMember.lastActiveStatus
      } : {})
    },
    create: {
      userId: userId,
      workspaceId: workspaceId,
      userName: 'User',
      userImage: '',
      status: 'ONLINE',
      lastActiveStatus: 'ONLINE',
      role: 'MEMBER',
      isFirstLogin: true,
      hasCustomName: false,
      hasCustomImage: false
    }
  });

  return {
    member: updatedMember,
    workspace
  };
} 