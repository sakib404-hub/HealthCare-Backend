/*
  Warnings:

  - You are about to drop the column `additiionalFiles` on the `doctors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "additiionalFiles",
ADD COLUMN     "additionalFiles" JSONB;
