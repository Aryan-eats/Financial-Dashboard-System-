-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('VIEWER', 'ANALYST', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "RecordCategory" AS ENUM ('SALARY', 'FREELANCE', 'INVESTMENT', 'FOOD', 'TRANSPORT', 'UTILITIES', 'ENTERTAINMENT', 'HEALTHCARE', 'SHOPPING', 'EDUCATION', 'RENT', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'VIEWER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_records" (
    "id" TEXT NOT NULL,
    "type" "RecordType" NOT NULL,
    "category" "RecordCategory" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "user_id" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "financial_records_user_id_deleted_at_idx" ON "financial_records"("user_id", "deleted_at");

-- CreateIndex
CREATE INDEX "financial_records_type_deleted_at_idx" ON "financial_records"("type", "deleted_at");

-- CreateIndex
CREATE INDEX "financial_records_category_deleted_at_idx" ON "financial_records"("category", "deleted_at");

-- CreateIndex
CREATE INDEX "financial_records_date_deleted_at_idx" ON "financial_records"("date", "deleted_at");

-- CreateIndex
CREATE INDEX "financial_records_user_id_type_date_idx" ON "financial_records"("user_id", "type", "date");

-- AddForeignKey
ALTER TABLE "financial_records" ADD CONSTRAINT "financial_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
