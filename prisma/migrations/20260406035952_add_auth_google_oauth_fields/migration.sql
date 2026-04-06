-- AlterTable
ALTER TABLE "users" ADD COLUMN     "businessName" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'email',
ALTER COLUMN "password" DROP NOT NULL,
ALTER COLUMN "role" DROP NOT NULL,
ALTER COLUMN "role" DROP DEFAULT;
