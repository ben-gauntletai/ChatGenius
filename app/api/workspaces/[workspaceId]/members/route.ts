import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { workspaceId } = params;

    const members = await prisma.workspaceMember.findMany({
      where: {
        workspaceId
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.log("[MEMBERS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
} 