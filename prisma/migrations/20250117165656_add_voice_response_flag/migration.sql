-- AlterTable
ALTER TABLE "DirectMessage" ADD COLUMN     "isVoiceResponse" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "FileUpload" ADD COLUMN     "isVoiceResponse" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Workspace" ALTER COLUMN "imageUrl" DROP NOT NULL;
