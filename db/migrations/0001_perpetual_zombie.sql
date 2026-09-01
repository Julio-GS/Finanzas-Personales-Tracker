ALTER TYPE "public"."movement_type" ADD VALUE 'transfer';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "destination_bank_entity" text;