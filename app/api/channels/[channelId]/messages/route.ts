import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Message } from "@prisma/client";

interface ExtendedWorkspaceMember {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  role: string;
  status: string;
  lastManualStatus: string | null;
  hasCustomName: boolean;
  hasCustomImage: boolean;
  workspaceId: string;
}

export async function GET(
  req: Request,
  { params }: { params: { channelId: string } }
) {
  try {
    const { channelId } = params;

    const channel = await prisma.channel.findUnique({
      where: {
        id: channelId
      }
    });

    if (!channel) {
      return new NextResponse("Channel not found", { status: 404 });
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
        threadId: null // Only fetch non-thread messages
      },
      include: {
        reactions: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    // Get all workspace members in a single query
    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId: channel.workspaceId
      }
    });

    // Create a map of userId to member for efficient lookup
    const memberMap = new Map(members.map(member => [member.userId, member as unknown as ExtendedWorkspaceMember]));

    // Update messages with latest profile info
    const updatedMessages = messages.map((message: Message & { reactions: any[] }) => {
      const member = memberMap.get(message.userId) as ExtendedWorkspaceMember | undefined;
      if (member) {
        return {
          ...message,
          userName: member.hasCustomName ? member.userName : 'User',
          userImage: member.hasCustomImage && member.userImage?.startsWith('/api/files/') ? member.userImage : null
        };
      }
      return message;
    });

    return NextResponse.json(updatedMessages);
  } catch (error) {
    console.log("[MESSAGES_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 