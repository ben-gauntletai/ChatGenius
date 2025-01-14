-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "hasThread" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isVectorized" BOOLEAN NOT NULL DEFAULT false;
