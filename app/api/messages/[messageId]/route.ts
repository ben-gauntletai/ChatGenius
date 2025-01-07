import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const { content } = await req.json()

    // Verify message ownership
    const message = await prisma.message.findUnique({
      where: { id: params.messageId }
    })

    if (!message || message.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const updatedMessage = await prisma.message.update({
      where: { id: params.messageId },
      data: { content }
    })

    return NextResponse.json(updatedMessage)
  } catch (error) {
    console.error('[MESSAGE_PATCH]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    // Verify message ownership
    const message = await prisma.message.findUnique({
      where: { id: params.messageId }
    })

    if (!message || message.userId !== userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    await prisma.message.delete({
      where: { id: params.messageId }
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('[MESSAGE_DELETE]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 