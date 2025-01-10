import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const channelId = params.channelId;

    // Get messages with their workspace member data
    const messages = await prisma.message.findMany({
      where: {
        channelId,
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        reactions: true
      }
    });

    // Get all workspace members in a single query
    const workspaceMembers = await prisma.workspaceMember.findMany({
      where: {
        userId: {
          in: messages.map(m => m.userId)
        }
      }
    });

    // Create a map for quick lookup
    const memberMap = new Map(
      workspaceMembers.map(member => [member.userId, member])
    );

    // Update messages with latest profile info
    const updatedMessages = messages.map(message => {
      const member = memberMap.get(message.userId);
      if (member) {
        return {
          ...message,
          userName: member.userName,
          userImage: member.userImage
        };
      }
      return message;
    });

    return NextResponse.json(updatedMessages);
  } catch (error) {
    console.error('[MESSAGES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 