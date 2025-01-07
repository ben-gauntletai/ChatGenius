/*
  Warnings:

  - You are about to drop the column `replyCount` on the `Message` table. All the data in the column will be lost.
  - The `role` column on the `WorkspaceMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[userId,messageId,emoji]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId,directMessageId,emoji]` on the table `Reaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userImage` to the `Reaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Message" DROP COLUMN "replyCount";

-- AlterTable
ALTER TABLE "Reaction" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "userImage" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Thread" ALTER COLUMN "messageId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkspaceMember" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "Message_channelId_idx" ON "Message"("channelId");

-- CreateIndex
CREATE INDEX "Message_workspaceId_idx" ON "Message"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_messageId_emoji_key" ON "Reaction"("userId", "messageId", "emoji");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_userId_directMessageId_emoji_key" ON "Reaction"("userId", "directMessageId", "emoji");

-- CreateIndex
CREATE INDEX "Thread_messageId_idx" ON "Thread"("messageId");
