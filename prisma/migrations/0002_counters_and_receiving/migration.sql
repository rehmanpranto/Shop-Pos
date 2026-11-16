-- AlterTable
ALTER TABLE "PurchaseItem" ADD COLUMN     "receivedQty" DECIMAL(14,3) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DocumentCounter" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentCounter_branchId_entity_key" ON "DocumentCounter"("branchId", "entity");


-- Purchases already marked as received have received everything.
UPDATE "PurchaseItem" pi SET "receivedQty" = pi."qty"
FROM "Purchase" p WHERE p."id" = pi."purchaseId" AND p."status" = 'RECEIVED';
