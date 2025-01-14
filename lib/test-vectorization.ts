import './test-setup';
import { PrismaClient } from '@prisma/client';
import * as vectorStore from './vector-store';

const prisma = new PrismaClient();

// Mock the vector store functions
const mockEmbedding = () => Array(1536).fill(0).map(() => Math.random());
const mockIndex = {
  upsert: jest.fn().mockResolvedValue(true),
  query: jest.fn().mockResolvedValue({
    matches: [
      {
        id: 'test_id',
        score: 0.9,
        metadata: {
          content: 'Test message about exercise',
          userId: 'test_user_id'
        }
      }
    ]
  })
};

jest.mock('./vector-store', () => ({
  ...jest.requireActual('./vector-store'),
  createEmbedding: jest.fn().mockImplementation(mockEmbedding),
  initVectorStore: jest.fn().mockImplementation(() => mockIndex)
}));

describe('Message Vectorization', () => {
  beforeAll(async () => {
    // Create test messages
    const testMessages = Array.from({ length: 25 }, (_, i) => ({
      content: `Test message ${i + 1} about exercise and fitness`,
      userId: 'test_user_id',
      userName: 'Test User',
      userImage: 'test_image.jpg',
      channelId: 'test_channel_id',
      workspaceId: 'test_workspace_id'
    }));

    await prisma.message.createMany({
      data: testMessages
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.message.deleteMany({
      where: { userId: 'test_user_id' }
    });
    await prisma.$disconnect();
  });

  it('should vectorize unvectorized messages', async () => {
    // Check initial unvectorized count
    const initialCount = await prisma.message.count({
      where: { isVectorized: false }
    });
    expect(initialCount).toBeGreaterThan(0);

    // Run vectorization
    const vectorizedCount = await vectorStore.checkAndVectorizeMessages();
    expect(vectorizedCount).toBeGreaterThan(0);

    // Check remaining unvectorized count
    const remainingCount = await prisma.message.count({
      where: { isVectorized: false }
    });
    expect(remainingCount).toBeLessThan(initialCount);
  });

  it('should query vectorized messages', async () => {
    const queryResult = await vectorStore.queryMessageVectors(
      "Tell me about exercise",
      { userId: 'test_user_id' }
    );
    
    expect(queryResult).toBeDefined();
    expect(queryResult.length).toBeGreaterThan(0);
    expect(queryResult[0].metadata.userId).toBe('test_user_id');
  });
}); 