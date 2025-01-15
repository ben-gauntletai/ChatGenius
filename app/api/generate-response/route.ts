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
    const { prompt, channelId, workspaceId, userId: requestUserId } = await req.json();
    
    // Get userId either from auth or request body
    const { userId: authUserId } = auth();
    const userId = authUserId || requestUserId;
    
    if (!userId) {
      return new NextResponse('Unauthorized - No userId provided', { status: 401 });
    }
    
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
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are generating an automated response on behalf of a user. The following messages show their writing style:

          ${context}

          You must match their exact writing style, including tone, formality, and any patterns in how they communicate. Your response should feel indistinguishable from their natural way of writing.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3
    });

    console.log('Response:', response.choices)

    return NextResponse.json({ response: response.choices[0].message.content });

  } catch (error) {
    console.error('[GENERATE_RESPONSE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
} 