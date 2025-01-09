import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return new NextResponse('No file provided', { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString('base64');

    // Store in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        fileName: file.name,
        fileType: file.type,
        data: base64Data
      }
    });

    const fileUrl = `/api/files/${fileUpload.id}`;

    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      type: file.type
    });
  } catch (error) {
    console.error('[UPLOAD_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 