import { NextResponse } from 'next/server';
import { auth, clerkClient, currentUser } from '@clerk/nextjs';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    console.log('\n=== Fetching Members ===');
    const { userId: currentUserId } = auth();

    // First get members with their stored status
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

    // Get active users from Clerk
    const activeUsers = await Promise.all(
      members.map(async member => {
        try {
          const user = await clerkClient.users.getUser(member.userId);
          // Check if user is signed out
          const isSignedOut = !user.lastSignInAt;
          
          return {
            userId: member.userId,
            isActive: !isSignedOut,
            hasImage: user.hasImage
          };
        } catch (error) {
          console.error(`Failed to get user ${member.userId}:`, error);
          return { 
            userId: member.userId, 
            isActive: false,
            hasImage: false
          };
        }
      })
    );

    const activeUsersMap = new Map(activeUsers.map(user => [user.userId, user]));

    // Update member statuses
    const updatedMembers = members.map(member => {
      const userInfo = activeUsersMap.get(member.userId);
      const isCurrentUser = member.userId === currentUserId;

      // If user is signed in or is current user, use their last manual status
      if (userInfo?.isActive || isCurrentUser) {
        return {
          ...member,
          status: member.status,
          hasImage: userInfo?.hasImage || false
        };
      }

      // If user is not active, set to OFFLINE
      return {
        ...member,
        status: 'OFFLINE',
        hasImage: userInfo?.hasImage || false
      };
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
        status: 'ONLINE'  // Default status for new members
      },
    });

    return NextResponse.json(member);
  } catch (error) {
    console.error('[MEMBERS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 