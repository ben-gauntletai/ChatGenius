import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { style, color, subject, customDetails } = await req.json();

    let prompt = `Generate a professional profile picture with the following characteristics:
      Style: ${style}
      Color scheme: ${color}
      Subject matter: ${subject}
      Make it suitable for a professional profile picture, centered, with good composition`;

    // Add custom details if provided
    if (customDetails) {
      prompt += `\nAdditional requirements: ${customDetails}`;
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "url",
    });

    return NextResponse.json({ imageUrl: response.data[0].url });
  } catch (error) {
    console.error('Error generating image:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
} 