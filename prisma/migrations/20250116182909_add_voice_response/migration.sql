-- AlterTable
ALTER TABLE "WorkspaceMember" ADD COLUMN     "autoResponseEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "voiceResponseEnabled" BOOLEAN NOT NULL DEFAULT false;
