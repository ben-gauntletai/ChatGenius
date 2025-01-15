import { OpenAI } from 'openai';
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs';
import { getContextAndGenerateResponse } from '@/lib/vector-store';
import { PrismaClient } from '@prisma/client';

interface PromptVariables {
  query: string;
  context: string;
}

const createPrompt = (template: string, variables: PromptVariables): string => {
  return template.replace(/{(\w+)}/g, (_, key) => variables[key as keyof PromptVariables] || '');
};

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { prompt, channelId, workspaceId, userId: requestUserId, receiverId } = await req.json();
    
    // Get userId either from auth or request body
    const { userId: authUserId } = auth();
    const userId = authUserId || requestUserId;
    
    if (!userId) {
      return new NextResponse('Unauthorized - No userId provided', { status: 401 });
    }

    // Get sender and receiver workspace member info
    const [senderMember, receiverMember] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { userId, workspaceId }
      }),
      receiverId ? prisma.workspaceMember.findFirst({
        where: { userId: receiverId, workspaceId }
      }) : null
    ]);

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
    console.log('Sender:', senderMember);
    console.log('Receiver:', receiverMember);

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
          content: `You are generating an response on behalf of ${receiverMember?.userName || 'a user'}. 

          The following messages show the receiver's writing style:

          ${context}

          You must match their exact writing style, including tone, formality, length, and any other patterns in how they communicate. Your response should feel indistinguishable from their natural way of writing.
          
          You are responding as ${receiverMember?.userName || 'the receiver'} to a message from ${senderMember?.userName || 'the sender'}.`
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