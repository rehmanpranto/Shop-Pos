CREATE TABLE "Manufacturer" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "manufacturerId" TEXT;

CREATE UNIQUE INDEX "Manufacturer_branchId_name_key" ON "Manufacturer"("branchId", "name");
CREATE INDEX "Manufacturer_branchId_isActive_idx" ON "Manufacturer"("branchId", "isActive");
CREATE INDEX "Product_manufacturerId_idx" ON "Product"("manufacturerId");

ALTER TABLE "Manufacturer" ADD CONSTRAINT "Manufacturer_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
