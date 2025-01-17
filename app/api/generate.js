import { NextResponse } from 'next/server';

export const config = {
  runtime: 'edge',
  regions: ['iad1'], // US East (N. Virginia)
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new NextResponse('Method not allowed', { status: 405 });
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout

    // Start the image generation process
    const response = await fetch(process.env.AI_IMAGE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AI_IMAGE_API_KEY}`
      },
      body: JSON.stringify(await req.json()),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      data 
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.name === 'AbortError' ? 'Request timeout' : 'Failed to generate image',
      details: error.message
    }, { 
      status: error.name === 'AbortError' ? 408 : 500 
    });
  }
}
  