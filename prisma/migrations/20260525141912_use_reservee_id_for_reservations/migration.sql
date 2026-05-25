/*
  Warnings:

  - You are about to drop the column `reserveeName` on the `Item` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Item" DROP COLUMN "reserveeName",
ADD COLUMN     "reserveeId" TEXT;
