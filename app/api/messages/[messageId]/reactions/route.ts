import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const user = await currentUser()
    if (!user) {
      return new NextResponse('User not found', { status: 404 })
    }

    const { emoji } = await req.json()

    // Find existing reaction
    const existingReaction = await prisma.reaction.findFirst({
      where: {
        messageId: params.messageId,
        userId: userId,
        emoji: emoji
      }
    })

    let updatedMessage

    if (existingReaction) {
      // Delete the reaction
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id
        }
      })
    } else {
      // Create new reaction
      await prisma.reaction.create({
        data: {
          emoji,
          userId,
          userName: user.firstName ?? 'Unknown User',
          messageId: params.messageId
        }
      })
    }

    // Fetch updated message with reactions
    updatedMessage = await prisma.message.findUnique({
      where: { 
        id: params.messageId 
      },
      include: {
        reactions: true
      }
    })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('[MESSAGE_REACTION_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 