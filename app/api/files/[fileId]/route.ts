import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: Request,
  { params }: { params: { fileId: string } }
) {
  try {
    const file = await prisma.fileUpload.findUnique({
      where: { id: params.fileId }
    });

    if (!file) {
      return new NextResponse('File not found', { status: 404 });
    }

    // If the data is a URL (starts with http/https), redirect to it
    if (file.data.startsWith('http')) {
      return NextResponse.redirect(file.data);
    }

    // Otherwise, treat it as base64 data
    const buffer = Buffer.from(file.data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': file.fileType,
        'Content-Disposition': `inline; filename="${file.fileName}"`
      }
    });
  } catch (error) {
    console.error('[FILE_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 