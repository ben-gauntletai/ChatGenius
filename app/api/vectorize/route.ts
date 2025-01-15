import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storeMessagesAsVectors } from '@/lib/vector-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Handle both single message and batch requests
    const messageIds = Array.isArray(body) ? body.map(m => m.messageId) : [body.messageId];
    
    // Fetch full message objects from database
    const messages = await prisma.message.findMany({
      where: {
        id: {
          in: messageIds
        }
      }
    });

    if (messages.length === 0) {
      return new NextResponse('Messages not found', { status: 404 });
    }

    // Store messages in vector database
    await storeMessagesAsVectors(messages);

    return NextResponse.json({ 
      success: true,
      vectorized: messages.length
    });
  } catch (error) {
    console.error('[VECTORIZE_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 