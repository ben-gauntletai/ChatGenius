import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { getContextAndGenerateResponse } from '@/lib/vector-store';

interface PromptVariables {
  query: string;
  context: string;
}

const createPrompt = (template: string, variables: PromptVariables): string => {
  return template.replace(/{(\w+)}/g, (_, key) => variables[key as keyof PromptVariables] || '');
};

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { prompt, channelId, workspaceId } = await req.json();
    
    // Get context and formatted prompt
    const { prompt: userPrompt, context } = await getContextAndGenerateResponse(
      prompt,
      userId,
      channelId,
      workspaceId
    );

    // Create prompt from template
    const promptTemplate = `Query: {query}

    Previous conversation context:
    {context}

    Generate a response that matches the style and tone of the conversation. Do not prefix your response with 'Response:' - just provide the response directly:`;

    const formattedPrompt = createPrompt(promptTemplate, {
      query: userPrompt,
      context: context
    });

    // Log for debugging
    console.log('Formatted prompt:', formattedPrompt);

    // Generate response using OpenAI
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('Context:', context)

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that matches the user's writing style. You should follow the style of these {context}"
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7
    });

    console.log('Response:', response.choices)

    return NextResponse.json({ response: response.choices[0].message.content });

  } catch (error) {
    console.error('[GENERATE_RESPONSE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 