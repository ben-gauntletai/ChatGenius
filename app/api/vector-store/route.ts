import { auth } from '@clerk/nextjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storeUserMessages } from '@/lib/vector-store';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // Get all messages from this user
    const messages = await prisma.message.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Store messages in vector database
    await storeUserMessages(userId, messages);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[VECTOR_STORE_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 