import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'
import { pusherServer } from '@/utils/pusher'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    const { content, channelId } = await req.json()

    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Get user details from Clerk
    const response = await fetch(
      `https://api.clerk.dev/v1/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    const user = await response.json()
    
    const message = await prisma.message.create({
      data: {
        content,
        channelId,
        userId,
        userName: `${user.first_name} ${user.last_name}`,
        userImage: user.image_url
      },
      include: {
        channel: true
      }
    })

    // Trigger pusher event
    await pusherServer.trigger(
      `channel-${channelId}`,
      'new-message',
      message
    )

    return NextResponse.json(message)
  } catch (error) {
    console.log('[MESSAGES_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 