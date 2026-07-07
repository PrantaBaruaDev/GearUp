-- DropIndex
DROP INDEX "payments_stripeCustomerId_key";

-- DropIndex
DROP INDEX "payments_stripeTransactionId_key";

-- AlterTable
ALTER TABLE "payments" ALTER COLUMN "stripeCustomerId" DROP NOT NULL,
ALTER COLUMN "stripeTransactionId" DROP NOT NULL;
