import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    console.log('\n=== Fetching Members ===');
    const { userId: currentUserId } = auth();

    // Get members with their stored status
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: params.workspaceId,
      },
      select: {
        id: true,
        userId: true,
        userName: true,
        userImage: true,
        role: true,
        status: true
      }
    });

    // Update member statuses
    const updatedMembers = members.map(member => {
      const isCurrentUser = member.userId === currentUserId;

      // If user is current user, use their stored status
      if (isCurrentUser) {
        return {
          ...member,
          status: member.status
        };
      }

      // For other users, return their stored status
      return member;
    });

    console.log('Members with status:', updatedMembers);
    return NextResponse.json(updatedMembers);
  } catch (error) {
    console.error('[MEMBERS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: params.workspaceId,
      },
    });

    if (existingMember) {
      // If member exists, return them without updating
      return NextResponse.json(existingMember);
    }

    // Create new member with default values
    const member = await prisma.workspaceMember.create({
      data: {
        userId,
        workspaceId: params.workspaceId,
        userName: 'User',
        userImage: '',
        role: 'MEMBER',
        status: 'ONLINE'
      }
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('[MEMBERS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 