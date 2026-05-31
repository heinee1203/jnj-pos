ALTER TABLE "inventory" ADD COLUMN IF NOT EXISTS "reorder_point_unit" varchar(20);
--> statement-breakpoint
UPDATE "inventory" i
SET "reorder_point_unit" = COALESCE(NULLIF(UPPER(p."selling_unit"), ''), 'PIECE')
FROM "products" p
WHERE i."product_id" = p."id"
  AND i."reorder_point_unit" IS NULL;
--> statement-breakpoint
UPDATE "inventory"
SET "reorder_point_unit" = 'PIECE'
WHERE "reorder_point_unit" IS NULL;
--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "reorder_point_unit" SET DEFAULT 'PIECE';
--> statement-breakpoint
ALTER TABLE "inventory" ALTER COLUMN "reorder_point_unit" SET NOT NULL;
