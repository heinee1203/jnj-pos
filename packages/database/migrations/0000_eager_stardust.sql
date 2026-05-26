CREATE TYPE "public"."location_type" AS ENUM('WAREHOUSE', 'RETAIL_STORE', 'SHOWROOM', 'STORE', 'TRANSIT_BUFFER');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'MANAGER', 'CASHIER', 'WAREHOUSE_STAFF', 'STAFF');--> statement-breakpoint
CREATE TYPE "public"."product_category" AS ENUM('SCHOOL_SUPPLIES', 'OFFICE_SUPPLIES', 'ART_SUPPLIES', 'GENERAL_MERCHANDISE', 'BAGS_ACCESSORIES', 'ELECTRONICS', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."actor_type" AS ENUM('USER', 'SYSTEM', 'INTEGRATION');--> statement-breakpoint
CREATE TYPE "public"."adjustment_reason_code" AS ENUM('COUNT_GAIN', 'FOUND_STOCK', 'OPENING_BALANCE', 'COUNT_LOSS', 'DAMAGED', 'DAMAGE_SHOWROOM', 'SHRINKAGE_MISSING', 'OBSOLETE_WRITE_OFF', 'DATA_CORRECTION');--> statement-breakpoint
CREATE TYPE "public"."journal_reference_type" AS ENUM('SALE', 'RECEIVING', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT', 'RETURN', 'STOCKTAKE', 'VOID', 'OPENING_BALANCE');--> statement-breakpoint
CREATE TYPE "public"."customer_type" AS ENUM('INDIVIDUAL', 'SHOP', 'FLEET', 'WHOLESALE');--> statement-breakpoint
CREATE TYPE "public"."customer_transaction_type" AS ENUM('CHARGE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('QUOTE', 'OPEN', 'PARKED', 'COMPLETED', 'VOIDED', 'PARTIALLY_REFUNDED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CASH', 'CARD', 'CREDIT_CARD', 'DEBIT_CARD', 'EFT', 'QRPH', 'GCASH', 'MAYA', 'BANK_TRANSFER', 'ACCOUNT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('DRAFT', 'SUBMITTED', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED_WITH_VARIANCE', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."count_item_status" AS ENUM('PENDING', 'COUNTED', 'VERIFIED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."count_status" AS ENUM('DRAFT', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."count_type" AS ENUM('FULL', 'CYCLE');--> statement-breakpoint
CREATE TYPE "public"."check_voucher_status" AS ENUM('DRAFT', 'APPROVED', 'PRINTED', 'RELEASED', 'CLEARED', 'VOIDED', 'STALE');--> statement-breakpoint
CREATE TYPE "public"."supplier_invoice_status" AS ENUM('OPEN', 'PARTIALLY_PAID', 'PAID', 'VOIDED', 'DISPUTED');--> statement-breakpoint
CREATE TYPE "public"."tag_type" AS ENUM('TIRE_SIZE', 'VEHICLE', 'APPLICATION_CODE', 'CUSTOM');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('CRITICAL', 'URGENT', 'NORMAL', 'INFO');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('STOCKOUT', 'LOW_STOCK_DIGEST', 'PO_RECEIVED', 'TRANSFER_COMPLETED', 'BACKORDER_AGING', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."device_registration_code_status" AS ENUM('ACTIVE', 'USED', 'EXPIRED', 'REVOKED');--> statement-breakpoint
CREATE TYPE "public"."device_status" AS ENUM('ACTIVATED', 'DEACTIVATED');--> statement-breakpoint
CREATE TYPE "public"."permission_category" AS ENUM('POS', 'BACKOFFICE');--> statement-breakpoint
CREATE TYPE "public"."connection_type" AS ENUM('tcp', 'bluetooth', 'usb');--> statement-breakpoint
CREATE TYPE "public"."printer_type" AS ENUM('zpl', 'escpos');--> statement-breakpoint
CREATE TYPE "public"."dv_payment_method" AS ENUM('CHECK', 'CASH', 'BANK_TRANSFER', 'ONLINE');--> statement-breakpoint
CREATE TYPE "public"."dv_status" AS ENUM('DRAFT', 'PRINTED', 'CONFIRMED', 'VOIDED');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) DEFAULT '' NOT NULL,
	"type" "location_type" NOT NULL,
	"address" varchar(500),
	"phone" varchar(50),
	"receipt_header" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"primary_location_id" uuid,
	"full_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'CASHIER' NOT NULL,
	"role_id" uuid,
	"pin_hash" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "product_families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brands" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(500) NOT NULL,
	"sku" varchar(50) NOT NULL,
	"mnemonic_sku" varchar(10) NOT NULL,
	"category" "product_category" NOT NULL,
	"unit_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"cost_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"current_cost_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"mnemonic_cost_code" varchar(10),
	"barcode" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_variable_price" boolean DEFAULT false NOT NULL,
	"category_id" uuid,
	"subcategory_id" uuid,
	"parent_product_id" uuid,
	"is_parent" boolean DEFAULT false NOT NULL,
	"family_id" uuid,
	"brand_id" uuid,
	"oem_number" varchar(100),
	"description" varchar(2000),
	"units_per_case" integer DEFAULT 1 NOT NULL,
	"packaging_unit" varchar(50),
	"selling_unit" varchar(20) DEFAULT 'piece' NOT NULL,
	"pieces_per_case" integer DEFAULT 1 NOT NULL,
	"purchase_unit" varchar(20),
	"conversion_factor" numeric(10, 4) DEFAULT '1' NOT NULL,
	"primary_supplier_id" uuid,
	"track_inventory" boolean DEFAULT true NOT NULL,
	"special_order" boolean DEFAULT false NOT NULL,
	"discontinued" boolean DEFAULT false NOT NULL,
	"reorder_enabled" boolean DEFAULT true NOT NULL,
	"custom_reorder_point" integer,
	"reorder_snoozed_until" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_mnemonic_sku_length" CHECK (char_length(mnemonic_sku) = 10),
	CONSTRAINT "chk_conversion_factor_positive" CHECK (conversion_factor > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"stock_level" integer DEFAULT 0 NOT NULL,
	"reserved_level" integer DEFAULT 0 NOT NULL,
	"reorder_point" integer DEFAULT 10 NOT NULL,
	"optimal_stock" integer DEFAULT 0 NOT NULL,
	"lead_time_days" integer DEFAULT 7 NOT NULL,
	"available_for_sale" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_reserved_level_non_negative" CHECK (reserved_level >= 0)
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_email" varchar(255),
	"contact_phone" varchar(50),
	"address" varchar(500),
	"mnemonic_code" varchar(2),
	"avg_lead_time_days" integer DEFAULT 7 NOT NULL,
	"contact_person" varchar(255),
	"tin" varchar(20),
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"bank_name" varchar(100),
	"bank_account_number" varchar(50),
	"bank_account_name" varchar(255),
	"bank_verified_at" timestamp with time zone,
	"bank_verified_by" uuid,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_journal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"user_id" uuid,
	"actor_type" "actor_type" DEFAULT 'USER' NOT NULL,
	"change_quantity" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"reference_type" "journal_reference_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"reference_line_id" uuid,
	"reason_code" "adjustment_reason_code",
	"idempotency_key" varchar(255) NOT NULL,
	"unit_cost_snapshot" numeric(12, 2),
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" varchar(500),
	"reversal_of_journal_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_journal_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(50) NOT NULL,
	"customer_type" "customer_type" DEFAULT 'INDIVIDUAL' NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"address" text,
	"tin" varchar(20),
	"credit_limit" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"payment_terms_days" integer DEFAULT 30 NOT NULL,
	"current_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"total_purchases" numeric(14, 2) DEFAULT '0.00' NOT NULL,
	"credit_status" varchar(40) DEFAULT 'OK' NOT NULL,
	"credit_hold_type" varchar(40) DEFAULT 'NONE' NOT NULL,
	"credit_hold_reason" text,
	"credit_hold_note" text,
	"credit_hold_approved_by" uuid,
	"credit_hold_approved_at" timestamp with time zone,
	"merged_into_customer_id" uuid,
	"merged_at" timestamp with time zone,
	"merged_by_user_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"tier_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" "customer_transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"balance_after" numeric(12, 2) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"reference_number" varchar(100),
	"payment_method" varchar(50),
	"notes" text,
	"recorded_by" uuid,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"billed" boolean DEFAULT false,
	"billed_soa_id" uuid,
	"payment_number" varchar(20),
	"batch_number" varchar(50),
	"trace_number" varchar(50),
	"card_type" varchar(20),
	"payment_lines" jsonb,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"due_date" date
);
--> statement-breakpoint
CREATE TABLE "sale_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit" varchar(10) DEFAULT 'piece' NOT NULL,
	"pieces_equivalent" integer,
	"refunded_quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 2) NOT NULL,
	"override_price" numeric(12, 2),
	"discount_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"line_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_sale_line_qty_positive" CHECK (quantity > 0)
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"sale_no" varchar(50) NOT NULL,
	"receipt_number" varchar(50),
	"location_id" uuid NOT NULL,
	"status" "sale_status" DEFAULT 'OPEN' NOT NULL,
	"customer_id" uuid,
	"subtotal" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"discount_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"tax_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"grand_total" numeric(12, 2) DEFAULT '0.00' NOT NULL,
	"notes" varchar(1000),
	"created_by_user_id" uuid NOT NULL,
	"completed_by_user_id" uuid,
	"voided_by_user_id" uuid,
	"refunded_by_user_id" uuid,
	"completed_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"idempotency_key" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"reference" varchar(255),
	"notes" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "po_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"ordered_qty" integer NOT NULL,
	"received_accepted_qty" integer DEFAULT 0 NOT NULL,
	"rejected_qty" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"list_price" numeric(12, 2),
	"discount_chain" varchar(100),
	"unit" varchar(20),
	"conversion_factor" numeric(10, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_po_ordered_qty_positive" CHECK (ordered_qty > 0),
	CONSTRAINT "chk_po_received_accepted_non_negative" CHECK (received_accepted_qty >= 0),
	CONSTRAINT "chk_po_rejected_non_negative" CHECK (rejected_qty >= 0),
	CONSTRAINT "chk_po_received_lte_ordered" CHECK (received_accepted_qty + rejected_qty <= ordered_qty)
);
--> statement-breakpoint
CREATE TABLE "po_receipt_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"po_line_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"received_accepted_qty" integer NOT NULL,
	"rejected_qty" integer NOT NULL,
	"unit_cost" numeric(12, 2) NOT NULL,
	"notes" varchar(500),
	"received_by_user_id" uuid NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"po_receipt_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "po_receipt_events_idempotency_key_unique" UNIQUE("idempotency_key"),
	CONSTRAINT "chk_receipt_qty_positive" CHECK (received_accepted_qty + rejected_qty > 0),
	CONSTRAINT "chk_receipt_accepted_non_negative" CHECK (received_accepted_qty >= 0),
	CONSTRAINT "chk_receipt_rejected_non_negative" CHECK (rejected_qty >= 0)
);
--> statement-breakpoint
CREATE TABLE "po_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"supplier_dr_no" varchar(100) NOT NULL,
	"received_by_user_id" uuid NOT NULL,
	"line_count" integer NOT NULL,
	"total_accepted_qty" integer NOT NULL,
	"total_rejected_qty" integer DEFAULT 0 NOT NULL,
	"notes" varchar(1000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"po_no" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"destination_location_id" uuid NOT NULL,
	"status" "purchase_order_status" DEFAULT 'DRAFT' NOT NULL,
	"expected_delivery_date" timestamp with time zone,
	"notes" varchar(1000),
	"created_by_user_id" uuid NOT NULL,
	"submitted_by_user_id" uuid,
	"cancelled_by_user_id" uuid,
	"closed_by_user_id" uuid,
	"submitted_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"idempotency_key" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "count_number_sequence" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(255) NOT NULL,
	"sku" varchar(100) NOT NULL,
	"brand_name" varchar(100),
	"category_name" varchar(100),
	"system_qty" integer NOT NULL,
	"counted_qty" integer,
	"variance" integer,
	"variance_cost" numeric(12, 2),
	"cost_price" numeric(12, 2) NOT NULL,
	"status" "count_item_status" DEFAULT 'PENDING' NOT NULL,
	"counted_by" uuid,
	"counted_at" timestamp with time zone,
	"notes" varchar(1000)
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"count_number" varchar(50) NOT NULL,
	"count_type" "count_type" NOT NULL,
	"status" "count_status" DEFAULT 'DRAFT' NOT NULL,
	"title" varchar(255),
	"notes" varchar(2000),
	"filter_criteria" jsonb,
	"total_items" integer DEFAULT 0 NOT NULL,
	"counted_items" integer DEFAULT 0 NOT NULL,
	"variance_count" integer DEFAULT 0 NOT NULL,
	"variance_value" numeric(14, 2) DEFAULT '0' NOT NULL,
	"started_at" timestamp with time zone,
	"review_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancel_reason" varchar(1000),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"code" varchar(100),
	"description" varchar(500),
	"color" varchar(7),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"parent_id" uuid,
	"family_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_option_values" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_type_id" uuid NOT NULL,
	"value" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variant_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"option_value_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"legal_name" text,
	"tin" text,
	"phone" text,
	"email" text,
	"address" text,
	"logo_url" text,
	"invoice_terms" text,
	"invoice_footer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organization_settings_org_id_unique" UNIQUE("org_id")
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"key_hash" varchar(128) NOT NULL,
	"label" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"priority" integer DEFAULT 1 NOT NULL,
	"supplier_sku" varchar(100),
	"supplier_cost" numeric(12, 2),
	"min_order_qty" integer DEFAULT 1 NOT NULL,
	"lead_time_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" varchar(1000),
	"last_ordered_at" timestamp with time zone,
	"last_cost" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"account_name" varchar(255) NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"account_number_display" varchar(20),
	"branch" varchar(100),
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_voucher_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"check_voucher_id" uuid NOT NULL,
	"supplier_invoice_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"deduction_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"deduction_reason" varchar(500)
);
--> statement-breakpoint
CREATE TABLE "check_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"cv_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"check_date" date NOT NULL,
	"check_number" varchar(50),
	"bank_name" varchar(100),
	"bank_account" varchar(50),
	"total_amount" numeric(14, 2) NOT NULL,
	"deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(14, 2) NOT NULL,
	"status" "check_voucher_status" DEFAULT 'DRAFT' NOT NULL,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"printed_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"cleared_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" varchar(500),
	"notes" varchar(2000),
	"prepared_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cv_number_sequence" (
	"org_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_date" date NOT NULL,
	"due_date" date NOT NULL,
	"total_amount" numeric(14, 2) NOT NULL,
	"paid_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(14, 2) NOT NULL,
	"status" "supplier_invoice_status" DEFAULT 'OPEN' NOT NULL,
	"payment_terms_days" integer,
	"currency" varchar(3) DEFAULT 'PHP' NOT NULL,
	"source_po_id" uuid,
	"source_receipt_id" uuid,
	"rtv_credit_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" varchar(2000),
	"recorded_by" uuid,
	"billed" boolean DEFAULT false NOT NULL,
	"billed_soa_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"tag_type" "tag_type" NOT NULL,
	"description" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"daily_digest_enabled" boolean DEFAULT true NOT NULL,
	"daily_digest_time" varchar(5) DEFAULT '07:00' NOT NULL,
	"stockout_email_enabled" boolean DEFAULT true NOT NULL,
	"stockout_inapp_enabled" boolean DEFAULT true NOT NULL,
	"low_stock_threshold" varchar(20) DEFAULT 'REORDER_POINT' NOT NULL,
	"email_address" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"user_id" uuid,
	"type" "notification_type" NOT NULL,
	"priority" "notification_priority" DEFAULT 'NORMAL' NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"link" varchar(500),
	"reference_type" varchar(50),
	"reference_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_emailed" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_device_registration_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"code_hash" varchar(128) NOT NULL,
	"status" "device_registration_code_status" DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by_user_id" uuid,
	"used_at" timestamp with time zone,
	"used_by_device_id" varchar(100),
	"used_by_pos_device_id" uuid
);
--> statement-breakpoint
CREATE TABLE "pos_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"location_id" uuid NOT NULL,
	"status" "device_status" DEFAULT 'ACTIVATED' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"app_version" varchar(20),
	"registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"registered_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" "permission_category" NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"velocity_class" varchar(30) NOT NULL,
	"age_bracket_min" integer DEFAULT 0 NOT NULL,
	"age_bracket_max" integer,
	"base_markup_pct" numeric(5, 2) NOT NULL,
	"max_markup_pct" numeric(5, 2),
	"inflation_rate_annual" numeric(4, 2) DEFAULT '5.00' NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"org_id" uuid NOT NULL,
	"label" varchar(50),
	"min_qty" integer NOT NULL,
	"max_qty" integer,
	"unit_price" numeric(12, 2) NOT NULL,
	"case_price" numeric(12, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_price_tier_product_org_min" UNIQUE("product_id","org_id","min_qty")
);
--> statement-breakpoint
CREATE TABLE "printers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"printer_type" "printer_type" DEFAULT 'zpl' NOT NULL,
	"connection_type" "connection_type" NOT NULL,
	"ip_address" varchar(45),
	"port" integer DEFAULT 9100,
	"bluetooth_mac" varchar(17),
	"label_width_mm" numeric(6, 1) DEFAULT '50' NOT NULL,
	"label_height_mm" numeric(6, 1) DEFAULT '30' NOT NULL,
	"dpmm" integer DEFAULT 8 NOT NULL,
	"darkness" integer DEFAULT 15,
	"speed" integer DEFAULT 4,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_tiers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"default_discount" numeric(5, 2) DEFAULT '0',
	"color" varchar(7),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discount_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"type" varchar(30) NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"scope" varchar(30) DEFAULT 'all' NOT NULL,
	"scope_ids" text,
	"min_quantity" integer,
	"min_amount" numeric(10, 2),
	"customer_tier_id" uuid,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"stackable" boolean DEFAULT false NOT NULL,
	"location_ids" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_sales_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"date" date NOT NULL,
	"ap_old_sales" integer DEFAULT 0 NOT NULL,
	"ap_new_sales" integer DEFAULT 0 NOT NULL,
	"ap_on_account" integer DEFAULT 0 NOT NULL,
	"ac_sales" integer DEFAULT 0 NOT NULL,
	"ac_on_account" integer DEFAULT 0 NOT NULL,
	"service_sales" integer DEFAULT 0 NOT NULL,
	"service_on_account" integer DEFAULT 0 NOT NULL,
	"painting_sales" integer DEFAULT 0 NOT NULL,
	"painting_on_account" integer DEFAULT 0 NOT NULL,
	"junior_sales" integer DEFAULT 0 NOT NULL,
	"payments" integer DEFAULT 0 NOT NULL,
	"source" varchar(20) DEFAULT 'IMPORT' NOT NULL,
	"notes" varchar(500),
	"recorded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dv_number_sequence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"last_number" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_disbursement_vouchers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" uuid NOT NULL,
	"dv_number" varchar(50) NOT NULL,
	"supplier_id" uuid NOT NULL,
	"soa_id" uuid,
	"amount" numeric(14, 2) NOT NULL,
	"gross_amount" numeric(14, 2),
	"total_deductions" numeric(14, 2) DEFAULT '0',
	"total_charges" numeric(14, 2) DEFAULT '0' NOT NULL,
	"net_amount" numeric(14, 2),
	"payment_method" "dv_payment_method" DEFAULT 'CHECK' NOT NULL,
	"check_number" varchar(50),
	"check_date" date,
	"bank_name" varchar(100),
	"payment_date" date NOT NULL,
	"remarks" text,
	"status" "dv_status" DEFAULT 'DRAFT' NOT NULL,
	"printed_at" timestamp with time zone,
	"confirmed_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"voided_by" uuid,
	"void_reason" varchar(500),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_dv_additional_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dv_id" uuid NOT NULL,
	"charge_type" text NOT NULL,
	"description" text NOT NULL,
	"reference_number" text,
	"amount" numeric(14, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_dv_deductions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dv_id" uuid NOT NULL,
	"deduction_type" text NOT NULL,
	"description" text NOT NULL,
	"reference_number" text,
	"amount" numeric(14, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_dv_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dv_id" uuid NOT NULL,
	"payment_method" "dv_payment_method" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"reference_number" varchar(100),
	"bank_name" varchar(100),
	"transaction_date" date,
	"platform" varchar(50),
	"received_by" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'OUTSTANDING',
	"bounce_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_dv_soas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dv_id" uuid NOT NULL,
	"soa_id" uuid NOT NULL,
	"allocated_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_primary_location_id_locations_id_fk" FOREIGN KEY ("primary_location_id") REFERENCES "public"."locations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_families" ADD CONSTRAINT "product_families_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brands" ADD CONSTRAINT "brands_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_subcategory_id_product_subcategories_id_fk" FOREIGN KEY ("subcategory_id") REFERENCES "public"."product_subcategories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_parent_product_id_products_id_fk" FOREIGN KEY ("parent_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_family_id_product_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."product_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_primary_supplier_id_suppliers_id_fk" FOREIGN KEY ("primary_supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_bank_verified_by_users_id_fk" FOREIGN KEY ("bank_verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_journal" ADD CONSTRAINT "stock_journal_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_journal" ADD CONSTRAINT "stock_journal_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_journal" ADD CONSTRAINT "stock_journal_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_journal" ADD CONSTRAINT "stock_journal_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_transactions" ADD CONSTRAINT "customer_transactions_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_lines" ADD CONSTRAINT "sale_lines_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_completed_by_user_id_users_id_fk" FOREIGN KEY ("completed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_voided_by_user_id_users_id_fk" FOREIGN KEY ("voided_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_refunded_by_user_id_users_id_fk" FOREIGN KEY ("refunded_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_lines" ADD CONSTRAINT "po_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_po_line_id_po_lines_id_fk" FOREIGN KEY ("po_line_id") REFERENCES "public"."po_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipt_events" ADD CONSTRAINT "po_receipt_events_po_receipt_id_po_receipts_id_fk" FOREIGN KEY ("po_receipt_id") REFERENCES "public"."po_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipts" ADD CONSTRAINT "po_receipts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipts" ADD CONSTRAINT "po_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_receipts" ADD CONSTRAINT "po_receipts_received_by_user_id_users_id_fk" FOREIGN KEY ("received_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_submitted_by_user_id_users_id_fk" FOREIGN KEY ("submitted_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_cancelled_by_user_id_users_id_fk" FOREIGN KEY ("cancelled_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_closed_by_user_id_users_id_fk" FOREIGN KEY ("closed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "count_number_sequence" ADD CONSTRAINT "count_number_sequence_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_product_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."product_families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_subcategories" ADD CONSTRAINT "product_subcategories_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_types" ADD CONSTRAINT "product_option_types_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_types" ADD CONSTRAINT "product_option_types_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_option_values" ADD CONSTRAINT "product_option_values_option_type_id_product_option_types_id_fk" FOREIGN KEY ("option_type_id") REFERENCES "public"."product_option_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variant_options" ADD CONSTRAINT "product_variant_options_option_value_id_product_option_values_id_fk" FOREIGN KEY ("option_value_id") REFERENCES "public"."product_option_values"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_settings" ADD CONSTRAINT "organization_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_suppliers" ADD CONSTRAINT "product_suppliers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_voucher_lines" ADD CONSTRAINT "check_voucher_lines_check_voucher_id_check_vouchers_id_fk" FOREIGN KEY ("check_voucher_id") REFERENCES "public"."check_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_voucher_lines" ADD CONSTRAINT "check_voucher_lines_supplier_invoice_id_supplier_invoices_id_fk" FOREIGN KEY ("supplier_invoice_id") REFERENCES "public"."supplier_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_vouchers" ADD CONSTRAINT "check_vouchers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_vouchers" ADD CONSTRAINT "check_vouchers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cv_number_sequence" ADD CONSTRAINT "cv_number_sequence_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_invoices" ADD CONSTRAINT "supplier_invoices_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_device_registration_codes" ADD CONSTRAINT "pos_device_registration_codes_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_device_registration_codes" ADD CONSTRAINT "pos_device_registration_codes_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_device_registration_codes" ADD CONSTRAINT "pos_device_registration_codes_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_device_registration_codes" ADD CONSTRAINT "pos_device_registration_codes_used_by_pos_device_id_pos_devices_id_fk" FOREIGN KEY ("used_by_pos_device_id") REFERENCES "public"."pos_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_devices" ADD CONSTRAINT "pos_devices_registered_by_user_id_users_id_fk" FOREIGN KEY ("registered_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "roles" ADD CONSTRAINT "roles_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_config" ADD CONSTRAINT "pricing_config_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_tiers" ADD CONSTRAINT "price_tiers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printers" ADD CONSTRAINT "printers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "printers" ADD CONSTRAINT "printers_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_tiers" ADD CONSTRAINT "customer_tiers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_rules" ADD CONSTRAINT "discount_rules_customer_tier_id_customer_tiers_id_fk" FOREIGN KEY ("customer_tier_id") REFERENCES "public"."customer_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales_summary" ADD CONSTRAINT "daily_sales_summary_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_sales_summary" ADD CONSTRAINT "daily_sales_summary_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_disbursement_vouchers" ADD CONSTRAINT "supplier_disbursement_vouchers_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_disbursement_vouchers" ADD CONSTRAINT "supplier_disbursement_vouchers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_dv_additional_charges" ADD CONSTRAINT "supplier_dv_additional_charges_dv_id_supplier_disbursement_vouchers_id_fk" FOREIGN KEY ("dv_id") REFERENCES "public"."supplier_disbursement_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_dv_deductions" ADD CONSTRAINT "supplier_dv_deductions_dv_id_supplier_disbursement_vouchers_id_fk" FOREIGN KEY ("dv_id") REFERENCES "public"."supplier_disbursement_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_dv_payments" ADD CONSTRAINT "supplier_dv_payments_dv_id_supplier_disbursement_vouchers_id_fk" FOREIGN KEY ("dv_id") REFERENCES "public"."supplier_disbursement_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_dv_soas" ADD CONSTRAINT "supplier_dv_soas_dv_id_supplier_disbursement_vouchers_id_fk" FOREIGN KEY ("dv_id") REFERENCES "public"."supplier_disbursement_vouchers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_locations_org_id" ON "locations" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_locations_org_code" ON "locations" USING btree ("org_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_families_org_slug" ON "product_families" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "idx_product_families_org_id" ON "product_families" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_brands_org_slug" ON "brands" USING btree ("org_id","slug");--> statement-breakpoint
CREATE INDEX "idx_brands_org_id" ON "brands" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_products_sku" ON "products" USING btree ("sku");--> statement-breakpoint
CREATE INDEX "idx_products_mnemonic_sku" ON "products" USING btree ("mnemonic_sku");--> statement-breakpoint
CREATE INDEX "idx_products_org_id" ON "products" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_products_name_trgm" ON "products" USING gin (name gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_products_family_id" ON "products" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "idx_products_barcode" ON "products" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_subcategory_id" ON "products" USING btree ("subcategory_id");--> statement-breakpoint
CREATE INDEX "idx_products_parent_id" ON "products" USING btree ("parent_product_id");--> statement-breakpoint
CREATE INDEX "idx_products_is_active" ON "products" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_products_brand_id" ON "products" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "idx_products_oem_number" ON "products" USING btree ("oem_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inventory_product_location" ON "inventory" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_location_id" ON "inventory" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_org_id" ON "inventory" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_available_for_sale" ON "inventory" USING btree ("location_id","available_for_sale");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_id" ON "suppliers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_org_active" ON "suppliers" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_suppliers_name" ON "suppliers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_journal_product_location" ON "stock_journal" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_journal_reference" ON "stock_journal" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "idx_journal_effective_at" ON "stock_journal" USING btree ("effective_at");--> statement-breakpoint
CREATE INDEX "idx_journal_org_id" ON "stock_journal" USING btree ("org_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_org_phone" ON "customers" USING btree ("org_id","phone");--> statement-breakpoint
CREATE INDEX "idx_customers_org_id" ON "customers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_customers_name" ON "customers" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_customers_org_type" ON "customers" USING btree ("org_id","customer_type");--> statement-breakpoint
CREATE INDEX "idx_customers_org_active" ON "customers" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_customer_txn_org_cust_date" ON "customer_transactions" USING btree ("org_id","customer_id","recorded_at");--> statement-breakpoint
CREATE INDEX "idx_customer_txn_org_ref" ON "customer_transactions" USING btree ("org_id","reference_id");--> statement-breakpoint
CREATE INDEX "idx_sale_lines_sale_id" ON "sale_lines" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_sales_org_id" ON "sales" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_sales_status" ON "sales" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sales_location_id" ON "sales" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_sales_customer_id" ON "sales" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sales_org_sale_no" ON "sales" USING btree ("org_id","sale_no");--> statement-breakpoint
CREATE INDEX "idx_sales_receipt_number" ON "sales" USING btree ("receipt_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sales_idempotency_key" ON "sales" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_sale_payments_sale_id" ON "sale_payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "idx_sale_payments_org_id" ON "sale_payments" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_po_lines_purchase_order_id" ON "po_lines" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_po_lines_product_id" ON "po_lines" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_po_receipt_events_po_id" ON "po_receipt_events" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_po_receipt_events_po_line_id" ON "po_receipt_events" USING btree ("po_line_id");--> statement-breakpoint
CREATE INDEX "idx_po_receipt_events_product_id" ON "po_receipt_events" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_po_receipt_events_receipt_id" ON "po_receipt_events" USING btree ("po_receipt_id");--> statement-breakpoint
CREATE INDEX "idx_po_receipts_po_id" ON "po_receipts" USING btree ("org_id","purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_po_receipts_dr_no" ON "po_receipts" USING btree ("org_id","supplier_dr_no");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_po_receipts_unique_dr" ON "po_receipts" USING btree ("org_id","purchase_order_id","supplier_dr_no");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_org_id" ON "purchase_orders" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_status" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_supplier_id" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_destination" ON "purchase_orders" USING btree ("destination_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_orders_org_po_no" ON "purchase_orders" USING btree ("org_id","po_no");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_orders_idempotency_key" ON "purchase_orders" USING btree ("idempotency_key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_count_items_count_product" ON "inventory_count_items" USING btree ("count_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_count_items_count_status" ON "inventory_count_items" USING btree ("count_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_counts_org_number" ON "inventory_counts" USING btree ("org_id","count_number");--> statement-breakpoint
CREATE INDEX "idx_counts_org_loc_status" ON "inventory_counts" USING btree ("org_id","location_id","status");--> statement-breakpoint
CREATE INDEX "idx_counts_org_created" ON "inventory_counts" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_org_slug" ON "categories" USING btree ("org_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_org_code" ON "categories" USING btree ("org_id","code");--> statement-breakpoint
CREATE INDEX "idx_categories_org_id" ON "categories" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_categories_parent_id" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_categories_family_id" ON "categories" USING btree ("family_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_subcategories_org_cat_slug" ON "product_subcategories" USING btree ("org_id","category_id","slug");--> statement-breakpoint
CREATE INDEX "idx_subcategories_org_category" ON "product_subcategories" USING btree ("org_id","category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_option_types_product_name" ON "product_option_types" USING btree ("org_id","product_id","name");--> statement-breakpoint
CREATE INDEX "idx_option_types_product_id" ON "product_option_types" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_option_values_type_value" ON "product_option_values" USING btree ("option_type_id","value");--> statement-breakpoint
CREATE INDEX "idx_option_values_type_id" ON "product_option_values" USING btree ("option_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_variant_options_product_value" ON "product_variant_options" USING btree ("product_id","option_value_id");--> statement-breakpoint
CREATE INDEX "idx_variant_options_product_id" ON "product_variant_options" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_variant_options_value_id" ON "product_variant_options" USING btree ("option_value_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_suppliers_unique" ON "product_suppliers" USING btree ("org_id","product_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_product_suppliers_priority" ON "product_suppliers" USING btree ("org_id","product_id","priority");--> statement-breakpoint
CREATE INDEX "idx_product_suppliers_supplier" ON "product_suppliers" USING btree ("org_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_bank_accounts_active" ON "bank_accounts" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_cv_lines_voucher" ON "check_voucher_lines" USING btree ("check_voucher_id");--> statement-breakpoint
CREATE INDEX "idx_cv_lines_invoice" ON "check_voucher_lines" USING btree ("supplier_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_check_vouchers_cv_number" ON "check_vouchers" USING btree ("org_id","cv_number");--> statement-breakpoint
CREATE INDEX "idx_check_vouchers_supplier" ON "check_vouchers" USING btree ("org_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_check_vouchers_status" ON "check_vouchers" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_check_vouchers_date" ON "check_vouchers" USING btree ("org_id","check_date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cv_sequence_unique" ON "cv_number_sequence" USING btree ("org_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_invoices_unique" ON "supplier_invoices" USING btree ("org_id","supplier_id","invoice_number");--> statement-breakpoint
CREATE INDEX "idx_supplier_invoices_status" ON "supplier_invoices" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_supplier_invoices_due" ON "supplier_invoices" USING btree ("org_id","due_date");--> statement-breakpoint
CREATE INDEX "idx_supplier_invoices_supplier_status" ON "supplier_invoices" USING btree ("org_id","supplier_id","status");--> statement-breakpoint
CREATE INDEX "idx_supplier_invoices_po" ON "supplier_invoices" USING btree ("org_id","source_po_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_invoices_billed_soa" ON "supplier_invoices" USING btree ("billed_soa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_tags_unique" ON "product_tags" USING btree ("org_id","product_id","tag_id");--> statement-breakpoint
CREATE INDEX "idx_product_tags_tag" ON "product_tags" USING btree ("org_id","tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_tags_name_unique" ON "tags" USING btree ("org_id","name");--> statement-breakpoint
CREATE INDEX "idx_tags_type" ON "tags" USING btree ("org_id","tag_type");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notification_settings_user" ON "notification_settings" USING btree ("org_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_unread" ON "notifications" USING btree ("org_id","user_id","is_read","created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_dedup" ON "notifications" USING btree ("org_id","reference_id","type","is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created" ON "notifications" USING btree ("org_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_device_reg_codes_org_hash" ON "pos_device_registration_codes" USING btree ("org_id","code_hash");--> statement-breakpoint
CREATE INDEX "idx_pos_device_reg_codes_org_status" ON "pos_device_registration_codes" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_pos_device_reg_codes_org_location" ON "pos_device_registration_codes" USING btree ("org_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_devices_org_device" ON "pos_devices" USING btree ("org_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_pos_devices_org_location" ON "pos_devices" USING btree ("org_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_roles_org_name" ON "roles" USING btree ("org_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pricing_config_unique" ON "pricing_config" USING btree ("org_id","velocity_class","age_bracket_min");--> statement-breakpoint
CREATE INDEX "idx_pricing_config_org" ON "pricing_config" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_printers_location" ON "printers" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_printers_org" ON "printers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_customer_tiers_org" ON "customer_tiers" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_discount_rules_org" ON "discount_rules" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "idx_discount_rules_active" ON "discount_rules" USING btree ("org_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_discount_rules_tier" ON "discount_rules" USING btree ("customer_tier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_daily_sales_org_date" ON "daily_sales_summary" USING btree ("org_id","date");--> statement-breakpoint
CREATE INDEX "idx_daily_sales_date" ON "daily_sales_summary" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dv_seq_org_year" ON "dv_number_sequence" USING btree ("org_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dv_org_number" ON "supplier_disbursement_vouchers" USING btree ("org_id","dv_number");--> statement-breakpoint
CREATE INDEX "idx_dv_org_supplier" ON "supplier_disbursement_vouchers" USING btree ("org_id","supplier_id");--> statement-breakpoint
CREATE INDEX "idx_dv_org_status" ON "supplier_disbursement_vouchers" USING btree ("org_id","status");--> statement-breakpoint
CREATE INDEX "idx_dv_org_soa" ON "supplier_disbursement_vouchers" USING btree ("org_id","soa_id");--> statement-breakpoint
CREATE INDEX "idx_dv_additional_charges_dv_id" ON "supplier_dv_additional_charges" USING btree ("dv_id");--> statement-breakpoint
CREATE INDEX "idx_dv_deductions_dv_id" ON "supplier_dv_deductions" USING btree ("dv_id");--> statement-breakpoint
CREATE INDEX "idx_dv_payments_dv" ON "supplier_dv_payments" USING btree ("dv_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_dv_soa_unique" ON "supplier_dv_soas" USING btree ("dv_id","soa_id");--> statement-breakpoint
CREATE INDEX "idx_dv_soa_dv" ON "supplier_dv_soas" USING btree ("dv_id");