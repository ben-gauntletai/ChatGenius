import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { queryMessageVectors } from '@/lib/vector-store';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { content, channelId, workspaceId } = await req.json();
    
    const filters: Record<string, any> = { userId };
    if (channelId) filters.channelId = channelId;
    if (workspaceId) filters.workspaceId = workspaceId;

    const similarMessages = await queryMessageVectors(content, filters);
    
    return NextResponse.json({ similarMessages });
  } catch (error) {
    console.error('[VECTOR_SEARCH]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 