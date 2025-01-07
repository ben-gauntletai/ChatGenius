import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { v4 as uuidv4 } from 'uuid'
import { existsSync } from 'fs'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) {
      return new NextResponse('No file provided', { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Create unique filename
    const uniqueFilename = `${uuidv4()}-${file.name}`
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    
    // Create uploads directory if it doesn't exist
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }
    
    const filePath = join(uploadDir, uniqueFilename)
    
    await writeFile(filePath, buffer)
    const fileUrl = `/uploads/${uniqueFilename}`

    console.log('File uploaded successfully:', {
      path: filePath,
      url: fileUrl,
      name: file.name,
      type: file.type
    })

    return NextResponse.json({
      url: fileUrl,
      name: file.name,
      type: file.type
    })
  } catch (error) {
    console.error('[UPLOAD_POST]', error)
    return new NextResponse('Internal Error', { status: 500 })
  }
} 