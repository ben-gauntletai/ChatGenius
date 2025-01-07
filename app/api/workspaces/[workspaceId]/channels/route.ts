import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const channels = await prisma.channel.findMany({
      where: {
        workspaceId: params.workspaceId
      },
      select: {
        id: true,
        name: true
      }
    })

    return NextResponse.json(channels)
  } catch (error) {
    console.error('[CHANNELS_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { name, description } = await req.json()

    const channel = await prisma.channel.create({
      data: {
        name,
        description,
        workspaceId: params.workspaceId,
      }
    })

    return NextResponse.json(channel)
  } catch (error) {
    console.error('[CHANNELS_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 