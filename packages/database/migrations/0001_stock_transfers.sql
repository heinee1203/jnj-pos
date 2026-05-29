DO $$ BEGIN
  CREATE TYPE "public"."stock_transfer_status" AS ENUM (
    'DRAFT',
    'APPROVED',
    'PICKING',
    'DISPATCHED',
    'PARTIALLY_RECEIVED',
    'RECEIVED',
    'CLOSED_WITH_VARIANCE',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "transfer_no" varchar(50) NOT NULL,
  "source_location_id" uuid NOT NULL,
  "destination_location_id" uuid NOT NULL,
  "status" "stock_transfer_status" DEFAULT 'DRAFT' NOT NULL,
  "notes" varchar(1000),
  "requested_by_user_id" uuid NOT NULL,
  "approved_by_user_id" uuid,
  "dispatched_by_user_id" uuid,
  "received_by_user_id" uuid,
  "approved_at" timestamp with time zone,
  "dispatched_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "idempotency_key" varchar(255),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_stock_transfer_locations_different" CHECK (source_location_id <> destination_location_id)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_transfer_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "transfer_id" uuid NOT NULL,
  "org_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "requested_qty" integer NOT NULL,
  "dispatched_qty" integer DEFAULT 0 NOT NULL,
  "received_qty" integer DEFAULT 0 NOT NULL,
  "variance_qty" integer DEFAULT 0 NOT NULL,
  "unit" varchar(20) DEFAULT 'PIECE' NOT NULL,
  "conversion_factor" numeric(10,4) DEFAULT '1' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_stock_transfer_requested_qty_positive" CHECK (requested_qty > 0),
  CONSTRAINT "chk_stock_transfer_dispatched_non_negative" CHECK (dispatched_qty >= 0),
  CONSTRAINT "chk_stock_transfer_received_non_negative" CHECK (received_qty >= 0),
  CONSTRAINT "chk_stock_transfer_variance_non_negative" CHECK (variance_qty >= 0),
  CONSTRAINT "chk_stock_transfer_dispatched_lte_requested" CHECK (dispatched_qty <= requested_qty),
  CONSTRAINT "chk_stock_transfer_received_lte_dispatched" CHECK (received_qty + variance_qty <= dispatched_qty),
  CONSTRAINT "chk_stock_transfer_conversion_positive" CHECK (conversion_factor > 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_transfer_receipts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "org_id" uuid NOT NULL,
  "transfer_id" uuid NOT NULL,
  "transfer_item_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "location_id" uuid NOT NULL,
  "received_qty" integer NOT NULL,
  "inventory_qty" integer NOT NULL,
  "notes" varchar(500),
  "received_by_user_id" uuid NOT NULL,
  "idempotency_key" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "chk_stock_transfer_receipt_qty_positive" CHECK (received_qty > 0),
  CONSTRAINT "chk_stock_transfer_receipt_inventory_positive" CHECK (inventory_qty > 0),
  CONSTRAINT "stock_transfer_receipts_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_location_id_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_dispatched_by_user_id_users_id_fk" FOREIGN KEY ("dispatched_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_receipts" ADD CONSTRAINT "stock_transfer_receipts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_receipts" ADD CONSTRAINT "stock_transfer_receipts_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_receipts" ADD CONSTRAINT "stock_transfer_receipts_transfer_item_id_stock_transfer_items_id_fk" FOREIGN KEY ("transfer_item_id") REFERENCES "public"."stock_transfer_items"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_receipts" ADD CONSTRAINT "stock_transfer_receipts_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_receipts" ADD CONSTRAINT "stock_transfer_receipts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "stock_transfer_receipts" ADD CONSTRAINT "stock_transfer_receipts_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_org_id" ON "stock_transfers" USING btree ("org_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_status" ON "stock_transfers" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_source" ON "stock_transfers" USING btree ("source_location_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfers_destination" ON "stock_transfers" USING btree ("destination_location_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_transfers_org_transfer_no" ON "stock_transfers" USING btree ("org_id","transfer_no");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_stock_transfers_idempotency_key" ON "stock_transfers" USING btree ("idempotency_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_items_transfer_id" ON "stock_transfer_items" USING btree ("transfer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_items_product_id" ON "stock_transfer_items" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_receipts_transfer_id" ON "stock_transfer_receipts" USING btree ("transfer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_receipts_item_id" ON "stock_transfer_receipts" USING btree ("transfer_item_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stock_transfer_receipts_inventory" ON "stock_transfer_receipts" USING btree ("product_id","location_id");
