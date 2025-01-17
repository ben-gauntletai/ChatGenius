import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { text, voiceId } = await req.json();

    if (!process.env.ELEVENLABS_API_KEY) {
      return new NextResponse('ElevenLabs API key not configured', { status: 500 });
    }

    // Call ElevenLabs API to generate voice
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': process.env.ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75
        }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[GENERATE_VOICE] ElevenLabs API error:', error);
      return new NextResponse('Failed to generate voice', { status: response.status });
    }

    // Get the audio data as a buffer
    const audioBuffer = await response.arrayBuffer();

    // Convert to base64
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return NextResponse.json({ 
      audio: base64Audio,
      format: 'mp3'
    });
  } catch (error) {
    console.error('[GENERATE_VOICE] Error:', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 