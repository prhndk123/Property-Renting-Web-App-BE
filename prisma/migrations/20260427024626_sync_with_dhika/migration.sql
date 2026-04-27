-- AlterTable
ALTER TABLE "peak_season_rates" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "property_categories" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reservation_rooms" ADD COLUMN     "qty" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "review_replies" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "reviews" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "qty" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "saved_payment_methods" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "cardName" TEXT NOT NULL,
    "lastFour" TEXT NOT NULL,
    "brand" TEXT,
    "expiry" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_inventories" (
    "id" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "totalStock" INTEGER NOT NULL DEFAULT 1,
    "bookedStock" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "room_inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_properties" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "propertyId" UUID NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_properties_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "saved_payment_methods_userId_idx" ON "saved_payment_methods"("userId");

-- CreateIndex
CREATE INDEX "saved_payment_methods_deletedAt_idx" ON "saved_payment_methods"("deletedAt");

-- CreateIndex
CREATE INDEX "room_inventories_roomId_idx" ON "room_inventories"("roomId");

-- CreateIndex
CREATE INDEX "room_inventories_date_idx" ON "room_inventories"("date");

-- CreateIndex
CREATE UNIQUE INDEX "room_inventories_roomId_date_key" ON "room_inventories"("roomId", "date");

-- CreateIndex
CREATE INDEX "saved_properties_userId_idx" ON "saved_properties"("userId");

-- CreateIndex
CREATE INDEX "saved_properties_propertyId_idx" ON "saved_properties"("propertyId");

-- CreateIndex
CREATE INDEX "saved_properties_deletedAt_idx" ON "saved_properties"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_properties_userId_propertyId_key" ON "saved_properties"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "peak_season_rates_deletedAt_idx" ON "peak_season_rates"("deletedAt");

-- CreateIndex
CREATE INDEX "properties_deletedAt_idx" ON "properties"("deletedAt");

-- CreateIndex
CREATE INDEX "property_categories_deletedAt_idx" ON "property_categories"("deletedAt");

-- CreateIndex
CREATE INDEX "review_replies_deletedAt_idx" ON "review_replies"("deletedAt");

-- CreateIndex
CREATE INDEX "reviews_deletedAt_idx" ON "reviews"("deletedAt");

-- CreateIndex
CREATE INDEX "rooms_deletedAt_idx" ON "rooms"("deletedAt");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- AddForeignKey
ALTER TABLE "saved_payment_methods" ADD CONSTRAINT "saved_payment_methods_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_inventories" ADD CONSTRAINT "room_inventories_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_properties" ADD CONSTRAINT "saved_properties_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
