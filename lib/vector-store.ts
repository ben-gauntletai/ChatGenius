import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import { PrismaClient, Message } from '@prisma/client';

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Pinecone client
const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

// Initialize OpenAI client lazily
let openaiClient: OpenAI | null = null;
const getOpenAIClient = () => {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
};

export const initVectorStore = () => {
  return pc.index(process.env.PINECONE_INDEX!);
};

export const createEmbedding = async (text: string): Promise<number[]> => {
  const response = await getOpenAIClient().embeddings.create({
    model: "text-embedding-ada-002",
    input: text
  });
  // Duplicate the embedding to match the 3072 dimension requirement
  const embedding = response.data[0].embedding;
  return [...embedding, ...embedding];
};

export const storeMessagesAsVectors = async (messages: Message[]) => {
  const index = initVectorStore();
  
  // Format messages for vector storage
  const vectors = await Promise.all(messages.map(async (message) => {
    const vector = await createEmbedding(message.content);
    return {
      id: message.id,
      values: vector,
      metadata: {
        userId: message.userId,
        content: message.content,
        userName: message.userName,
        channelId: message.channelId,
        workspaceId: message.workspaceId,
        createdAt: message.createdAt.toISOString(),
        updatedAt: message.updatedAt.toISOString(),
        hasThread: Boolean(message.threadId)
      }
    };
  }));
  
  // Upsert vectors to Pinecone
  await index.upsert(vectors);
  
  // Mark messages as vectorized in database
  await prisma.message.updateMany({
    where: {
      id: {
        in: messages.map(m => m.id)
      }
    },
    data: {
      isVectorized: true
    }
  });
};

export const getUnvectorizedMessages = async (minCount: number = 20): Promise<Message[]> => {
  // First check total count
  const count = await prisma.message.count({
    where: {
      isVectorized: false
    }
  });

  // Only proceed if we have enough messages
  if (count >= minCount) {
    return prisma.message.findMany({
      where: {
        isVectorized: false
      }
    });
  }
  
  return [];
};

export const queryMessageVectors = async (prompt: string, filters: Record<string, any>) => {
  const index = initVectorStore();
  
  // Get vector for the prompt
  const queryEmbedding = await createEmbedding(prompt);
  
  // Query existing vectors with filters
  const queryResponse = await index.query({
    vector: queryEmbedding,
    topK: 5,
    includeMetadata: true,
    filter: filters
  });
  
  return queryResponse.matches || [];
};

// New function to check and vectorize messages on login
export const checkAndVectorizeMessages = async (): Promise<number> => {
  try {
    // Get unvectorized messages if we have enough
    const messages = await getUnvectorizedMessages(20);
    
    // If we have messages to vectorize, process them
    if (messages.length > 0) {
      await storeMessagesAsVectors(messages);
      return messages.length;
    }
    
    return 0;
  } catch (error) {
    console.error('Error vectorizing messages:', error);
    return 0;
  }
};

export const storeUserMessages = async (userId: string, messages: Message[]) => {
  const messagesToVectorize = messages.filter(m => !m.isVectorized);
  if (messagesToVectorize.length > 0) {
    await storeMessagesAsVectors(messagesToVectorize);
    return messagesToVectorize.length;
  }
  return 0;
};

export const getSimilarMessages = async (content: string, userId: string, channelId?: string, workspaceId?: string) => {
  const filters: Record<string, any> = { userId };
  if (channelId) filters.channelId = channelId;
  if (workspaceId) filters.workspaceId = workspaceId;
  
  return queryMessageVectors(content, filters);
};

export const getContextAndGenerateResponse = async (prompt: string, userId: string, channelId?: string, workspaceId?: string) => {
  // 1. Set up filters for vector search - filter by userId to get their style
  const filters: Record<string, any> = { userId };  // Always include userId filter
  if (channelId) filters.channelId = channelId;
  if (workspaceId) filters.workspaceId = workspaceId;

  // 2. Query vector store for relevant messages from this user
  const matches = await queryMessageVectors(prompt, filters);
  
  // 3. Format context from matches with metadata
  const context = matches
    .filter(m => m.metadata && typeof m.metadata === 'object')
    .map(m => {
      const metadata = m.metadata as { content: string; userName: string; createdAt: string };
      return `${metadata.userName} (${new Date(metadata.createdAt).toLocaleString()}): ${metadata.content}`;
    })
    .join('\n');

  console.log('[VECTOR_STORE] Found messages from user:', context);

  return {
    prompt,
    context
  };
}; 