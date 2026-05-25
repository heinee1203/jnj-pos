import {
  pgTable,
  uuid,
  integer,
  numeric,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { products } from "./products";
import { organizations } from "./organizations";

export const priceTiers = pgTable(
  "price_tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    /** Optional human-readable label (e.g. "Retail", "Wholesale", "Dozen") */
    label: varchar("label", { length: 50 }),
    /** Minimum quantity for this price tier to apply */
    minQty: integer("min_qty").notNull(),
    /** Maximum quantity (NULL = unlimited / no upper bound) */
    maxQty: integer("max_qty"),
    /** Per-piece price at this tier */
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    /** Per-case price at this tier (NULL if not sold by case) */
    casePrice: numeric("case_price", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("uq_price_tier_product_org_min").on(
      table.productId,
      table.orgId,
      table.minQty,
    ),
  ],
);
