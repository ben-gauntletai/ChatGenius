/*
  Warnings:

  - You are about to drop the column `joinedAt` on the `WorkspaceMember` table. All the data in the column will be lost.
  - You are about to drop the column `lastManualStatus` on the `WorkspaceMember` table. All the data in the column will be lost.
  - The `role` column on the `WorkspaceMember` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `updatedAt` to the `WorkspaceMember` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WorkspaceMember_workspaceId_userId_key";

-- AlterTable
ALTER TABLE "DirectMessage" ALTER COLUMN "senderImage" DROP NOT NULL,
ALTER COLUMN "receiverImage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "replyCount" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "userImage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Reaction" ALTER COLUMN "userImage" DROP NOT NULL;

-- AlterTable
ALTER TABLE "WorkspaceMember" DROP COLUMN "joinedAt",
DROP COLUMN "lastManualStatus",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "hasCustomImage" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasCustomName" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "userName" SET DEFAULT 'User',
ALTER COLUMN "userImage" SET DEFAULT '',
ALTER COLUMN "status" SET DEFAULT 'OFFLINE',
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'MEMBER';

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
