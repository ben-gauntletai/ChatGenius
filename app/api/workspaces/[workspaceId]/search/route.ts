import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    const messages = await prisma.message.findMany({
      where: {
        workspaceId: params.workspaceId,
        content: {
          contains: query,
          mode: 'insensitive'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[SEARCH_ERROR]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 