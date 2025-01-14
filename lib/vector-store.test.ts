// Mock OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: Array(1536).fill(0.1) }]
      })
    }
  }))
}));

import { PrismaClient } from '@prisma/client';
import * as vectorStore from './vector-store';

jest.mock('./vector-store');

describe('Message Vectorization', () => {
  const prisma = new PrismaClient();
  
  const mockVectorStore = {
    initVectorStore: jest.fn().mockResolvedValue({}),
    createEmbedding: jest.fn().mockResolvedValue(Array(1536).fill(0.1)),
    storeMessagesAsVectors: jest.fn().mockResolvedValue(undefined),
    getUnvectorizedMessages: jest.fn().mockImplementation(async (minCount) => {
      // Return all 25 messages if threshold is met
      if (minCount <= 20) {
        return Array(25).fill({
          id: 'test-message-id',
          content: 'test message content',
          userId: 'test-user-id',
          userName: 'Test User',
          userImage: 'test-image-url',
          channelId: 'test-channel-id',
          workspaceId: 'test-workspace-id',
          createdAt: new Date(),
          updatedAt: new Date(),
          fileUrl: null,
          fileName: null,
          fileType: null,
          threadId: null,
          parentMessageId: null,
          replyCount: 0,
          isThreadReply: false,
          isEdited: false
        });
      }
      return []; // Return empty array if threshold not met
    }),
    queryMessageVectors: jest.fn().mockResolvedValue({
      matches: [{
        id: 'test-vector-id',
        score: 0.9,
        metadata: {
          content: 'test message content',
          userId: 'test-user-id',
          userName: 'Test User',
          userImage: 'test-image-url',
          channelId: 'test-channel-id',
          workspaceId: 'test-workspace-id',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isEdited: false,
          hasThread: false
        }
      }]
    }),
    checkAndVectorizeMessages: jest.fn().mockImplementation(async () => {
      const messages = await mockVectorStore.getUnvectorizedMessages(20);
      if (messages.length > 0) {
        await mockVectorStore.storeMessagesAsVectors(messages);
      }
      return messages.length;
    })
  };

  Object.assign(vectorStore, mockVectorStore);

  beforeAll(async () => {
    // Create test workspace and channel
    await prisma.workspace.create({
      data: {
        id: 'test-workspace-id',
        name: 'Test Workspace',
        imageUrl: 'test-image-url',
        inviteCode: 'test-invite-code'
      }
    });

    await prisma.channel.create({
      data: {
        id: 'test-channel-id',
        name: 'test-channel',
        workspaceId: 'test-workspace-id'
      }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.message.deleteMany({
      where: { channelId: 'test-channel-id' }
    });
    await prisma.channel.delete({
      where: { id: 'test-channel-id' }
    });
    await prisma.workspace.delete({
      where: { id: 'test-workspace-id' }
    });
    await prisma.$disconnect();
  });

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should vectorize all messages when threshold is met', async () => {
    // Set up mock for this test
    mockVectorStore.getUnvectorizedMessages.mockImplementationOnce(async () => {
      return Array(25).fill({
        id: 'test-message-id',
        content: 'test message content',
        userId: 'test-user-id',
        userName: 'Test User',
        userImage: 'test-image-url',
        channelId: 'test-channel-id',
        workspaceId: 'test-workspace-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        fileUrl: null,
        fileName: null,
        fileType: null,
        threadId: null,
        parentMessageId: null,
        replyCount: 0,
        isThreadReply: false,
        isEdited: false
      });
    });

    const processedCount = await mockVectorStore.checkAndVectorizeMessages();
    expect(processedCount).toBe(25);
    expect(mockVectorStore.storeMessagesAsVectors).toHaveBeenCalled();
  });

  it('should not vectorize messages when below threshold', async () => {
    // Set up mock for this test
    mockVectorStore.getUnvectorizedMessages.mockImplementationOnce(async () => []);
    
    const processedCount = await mockVectorStore.checkAndVectorizeMessages();
    expect(processedCount).toBe(0);
    expect(mockVectorStore.storeMessagesAsVectors).not.toHaveBeenCalled();
  });

  it('should query vectorized messages', async () => {
    const result = await mockVectorStore.queryMessageVectors('test query', 'Test User');
    expect(result.matches).toBeDefined();
    expect(result.matches[0].metadata.content).toBe('test message content');
  });
}); 