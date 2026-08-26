CREATE TYPE "public"."movement_type" AS ENUM('income', 'expense', 'investment');--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"date" date NOT NULL,
	"type" "movement_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"bank_entity" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"raw_audio_prompt" text
);
--> statement-breakpoint
CREATE INDEX "idx_transactions_date" ON "transactions" USING btree ("date" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "idx_transactions_type" ON "transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_transactions_entity" ON "transactions" USING btree ("bank_entity");