/*
  Warnings:

  - A unique constraint covering the columns `[name,tenantId]` on the table `property_categories` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `property_categories` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "property_categories_name_key";

-- AlterTable
ALTER TABLE "property_categories" ADD COLUMN     "tenantId" UUID NOT NULL;

-- CreateIndex
CREATE INDEX "property_categories_tenantId_idx" ON "property_categories"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "property_categories_name_tenantId_key" ON "property_categories"("name", "tenantId");

-- AddForeignKey
ALTER TABLE "property_categories" ADD CONSTRAINT "property_categories_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
