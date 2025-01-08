import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    console.log('\n=== Fetching Members ===');
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
        status: true,        // Explicitly include status
        statusUpdatedAt: true,  // Include statusUpdatedAt
        joinedAt: true
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

    console.log('Members with status:', members);
    return NextResponse.json(members);
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

    const user = await currentUser();
    if (!user) {
      return new NextResponse('User not found', { status: 404 });
    }

    // Check if already a member and get their last status
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: params.workspaceId,
      },
    });

    if (existingMember) {
      // If member exists, update their info but keep their status
      const updatedMember = await prisma.workspaceMember.update({
        where: {
          id: existingMember.id
        },
        data: {
          userName: `${user.firstName} ${user.lastName}`,
          userImage: user.imageUrl,
        }
      });
      return NextResponse.json(updatedMember);
    }

    // Add as new member with default ONLINE status
    const member = await prisma.workspaceMember.create({
      data: {
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        workspaceId: params.workspaceId,
        role: 'MEMBER',
        status: 'ONLINE',  // Default status for new members
        statusUpdatedAt: new Date(),
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('[MEMBERS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 