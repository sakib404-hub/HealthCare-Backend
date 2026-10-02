/*
  Warnings:

  - A unique constraint covering the columns `[marchantInvoiceNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[bkashPayemtnId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `marchantInvoiceNumber` to the `payments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `refundAmount` to the `payments` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bkashPayemtnId" TEXT,
ADD COLUMN     "bkashTransactionId" TEXT,
ADD COLUMN     "gateWayResponse" JSONB,
ADD COLUMN     "marchantInvoiceNumber" TEXT NOT NULL,
ADD COLUMN     "paidAt" TEXT,
ADD COLUMN     "payerReference" TEXT,
ADD COLUMN     "paymentGateWay" TEXT NOT NULL DEFAULT 'Bkash',
ADD COLUMN     "refundAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundTrxId" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "payments_marchantInvoiceNumber_key" ON "payments"("marchantInvoiceNumber");

-- CreateIndex
CREATE UNIQUE INDEX "payments_bkashPayemtnId_key" ON "payments"("bkashPayemtnId");
