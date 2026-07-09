/*
  Warnings:

  - The values [PAID] on the enum `OrderStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "OrderStatus_new" AS ENUM ('PENDING', 'CONFIRMED', 'PICKED_UP', 'RETURNED', 'CANCELLED');
ALTER TABLE "public"."rental_orders" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "rental_orders" ALTER COLUMN "status" TYPE "OrderStatus_new" USING ("status"::text::"OrderStatus_new");
ALTER TYPE "OrderStatus" RENAME TO "OrderStatus_old";
ALTER TYPE "OrderStatus_new" RENAME TO "OrderStatus";
DROP TYPE "public"."OrderStatus_old";
ALTER TABLE "rental_orders" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;
