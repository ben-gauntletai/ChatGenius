import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  let retries = 0;
  
  while (retries < MAX_RETRIES) {
    try {
      const { userId } = auth();
      if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
      }

      const { workspaceId } = params;

      const members = await prisma.workspaceMember.findMany({
        where: {
          workspaceId
        }
      });

      return NextResponse.json(members);
    } catch (error) {
      console.error("[MEMBERS_GET]", error);
      retries++;
      
      if (retries === MAX_RETRIES) {
        return new NextResponse("Internal Error", { status: 500 });
      }
      
      await wait(RETRY_DELAY * retries); // Exponential backoff
    }
  }
  
  return new NextResponse("Internal Error", { status: 500 });
} 