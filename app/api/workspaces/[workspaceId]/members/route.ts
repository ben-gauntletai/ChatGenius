import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: params.workspaceId,
      },
      orderBy: {
        joinedAt: 'asc',
      },
    });

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

    // Check if already a member
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: params.workspaceId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(existingMember);
    }

    // Add as new member
    const member = await prisma.workspaceMember.create({
      data: {
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        workspaceId: params.workspaceId,
        role: 'MEMBER',
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('[MEMBERS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 