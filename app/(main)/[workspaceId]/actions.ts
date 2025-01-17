'use server';

import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function getWorkspaceData(workspaceId: string) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return null;
    }

    // Check if workspace exists first
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: { members: true }
    });

    if (!workspace) {
      return null;
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
      }
    });

    return {
      workspace,
      member: updatedMember
    };
  } catch (error) {
    console.error('[WORKSPACE_DATA_ERROR]', error);
    return null;
  }
} 