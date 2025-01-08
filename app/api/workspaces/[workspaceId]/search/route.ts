import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    console.log('Search request:', {
      workspaceId: params.workspaceId,
      query,
      userId
    })

    if (!query) {
      return NextResponse.json([])
    }

    // Super simple query just to test basic functionality
    const messages = await prisma.message.findMany({
      where: {
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        channelId: true,
        channel: {
          select: {
            name: true
          }
        }
      },
      take: 10
    })

    console.log('Found messages:', messages.length)

    const formattedResults = messages.map(message => ({
      id: message.id,
      content: message.content,
      channelId: message.channelId,
      channelName: message.channel?.name || 'Unknown Channel',
      createdAt: message.createdAt.toISOString()
    }))

    return NextResponse.json(formattedResults)

  } catch (error: any) {
    console.error('Search error:', {
      error: error?.message || 'Unknown error',
      stack: error?.stack
    })
    
    return NextResponse.json({ 
      error: error?.message || "Internal server error" 
    }, { 
      status: 500 
    })
  }
} 