-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "isThreadReply" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parentMessageId" TEXT;

-- CreateIndex
CREATE INDEX "Message_parentMessageId_idx" ON "Message"("parentMessageId");
