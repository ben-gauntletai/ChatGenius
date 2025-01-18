import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { style, color, subject } = await req.json();

    const prompt = `Generate a professional profile picture with the following characteristics:
      Style: ${style}
      Color scheme: ${color}
      Subject matter: ${subject}
      Make it suitable for a professional profile picture, centered, with good composition and high quality details.`;

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error('No image URL received from OpenAI');
    }

    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to download image from OpenAI');
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Data = Buffer.from(imageBuffer).toString('base64');

    // Store in database
    const fileUpload = await prisma.fileUpload.create({
      data: {
        fileName: 'ai-generated-profile.png',
        fileType: 'image/png',
        data: base64Data
      }
    });

    return NextResponse.json({ imageUrl: `/api/files/${fileUpload.id}` });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
} 