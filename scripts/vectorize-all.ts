import { PrismaClient } from '@prisma/client';
import { storeMessagesAsVectors } from '../lib/vector-store';

const prisma = new PrismaClient();

async function vectorizeAll() {
  try {
    // Get all messages
    const messages = await prisma.message.findMany();
    const directMessages = await prisma.directMessage.findMany();

    console.log(`Found ${messages.length} regular messages and ${directMessages.length} direct messages to vectorize`);

    // Convert direct messages to the Message format for vectorization
    const formattedDirectMessages = directMessages.map(dm => ({
      id: dm.id,
      content: dm.content,
      userId: dm.senderId,
      userName: dm.senderName,
      userImage: dm.senderImage,
      workspaceId: dm.workspaceId,
      channelId: `dm-${[dm.senderId, dm.receiverId].sort().join('-')}`,
      createdAt: dm.createdAt,
      updatedAt: dm.updatedAt,
      fileUrl: dm.fileUrl,
      fileName: dm.fileName,
      fileType: dm.fileType,
      threadId: null,
      isThreadReply: false,
      parentMessageId: null,
      replyCount: 0,
      isEdited: false,
      isVectorized: false
    }));

    // Combine all messages
    const allMessages = [...messages, ...formattedDirectMessages];
    
    if (allMessages.length === 0) {
      console.log('No messages found to vectorize');
      return;
    }

    console.log('Starting vectorization of all messages...');

    // Process in batches of 50 to avoid overwhelming the system
    const batchSize = 50;
    const batches = Math.ceil(allMessages.length / batchSize);
    let vectorizedCount = 0;

    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, allMessages.length);
      const batch = allMessages.slice(start, end);

      try {
        await storeMessagesAsVectors(batch);
        vectorizedCount += batch.length;
        console.log(`Vectorized batch ${i + 1}/${batches} (${vectorizedCount}/${allMessages.length} total)`);
      } catch (error) {
        console.error(`Failed to vectorize batch ${i + 1}:`, error);
      }

      // Add a small delay between batches to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Mark all messages as vectorized
    if (messages.length > 0) {
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
    }

    console.log(`Vectorization complete. ${vectorizedCount}/${allMessages.length} messages vectorized.`);
  } catch (error) {
    console.error('Error during vectorization:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
vectorizeAll(); 