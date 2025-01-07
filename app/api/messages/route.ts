import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const user = await currentUser()
    const { content, channelId, workspaceId, fileUrl, fileName, fileType } = await req.json()

    if (!userId || !user) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    console.log('Creating message with:', { content, channelId, workspaceId, fileUrl, fileName, fileType }) // Debug log

    const message = await prisma.message.create({
      data: {
        content,
        fileUrl,
        fileName,
        fileType,
        userId,
        userName: `${user.firstName} ${user.lastName}`,
        userImage: user.imageUrl,
        channelId,
        workspaceId,
      },
      include: {
        reactions: true
      }
    })

    console.log('Created message:', message) // Debug log

    // Trigger Pusher event
    await pusherServer.trigger(`channel-${channelId}`, 'new-message', message)

    return NextResponse.json(message)
  } catch (error) {
    console.error('[MESSAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const channelId = searchParams.get('channelId')

    if (!channelId) {
      return new NextResponse('Channel ID missing', { status: 400 })
    }

    const messages = await prisma.message.findMany({
      where: {
        channelId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        userName: true,
        userImage: true,
        fileUrl: true,
        fileName: true,
        fileType: true,
        reactions: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    })

    console.log('Retrieved messages with file data:', messages) // Debug log

    return NextResponse.json(messages)
  } catch (error) {
    console.error('[MESSAGES_GET]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 