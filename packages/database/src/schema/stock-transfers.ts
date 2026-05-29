import {
  check,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { locations } from "./locations";
import { organizations } from "./organizations";
import { products } from "./products";
import { users } from "./users";

export const stockTransferStatusEnum = pgEnum("stock_transfer_status", [
  "DRAFT",
  "APPROVED",
  "PICKING",
  "DISPATCHED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CLOSED_WITH_VARIANCE",
  "CANCELLED",
]);

export const stockTransfers = pgTable(
  "stock_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    transferNo: varchar("transfer_no", { length: 50 }).notNull(),
    sourceLocationId: uuid("source_location_id")
      .notNull()
      .references(() => locations.id),
    destinationLocationId: uuid("destination_location_id")
      .notNull()
      .references(() => locations.id),
    status: stockTransferStatusEnum("status").notNull().default("DRAFT"),
    notes: varchar("notes", { length: 1000 }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    dispatchedByUserId: uuid("dispatched_by_user_id").references(
      () => users.id,
      { onDelete: "set null" },
    ),
    receivedByUserId: uuid("received_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    idempotencyKey: varchar("idempotency_key", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_stock_transfers_org_id").on(table.orgId),
    index("idx_stock_transfers_status").on(table.status),
    index("idx_stock_transfers_source").on(table.sourceLocationId),
    index("idx_stock_transfers_destination").on(table.destinationLocationId),
    uniqueIndex("idx_stock_transfers_org_transfer_no").on(
      table.orgId,
      table.transferNo,
    ),
    uniqueIndex("idx_stock_transfers_idempotency_key").on(
      table.idempotencyKey,
    ),
    check(
      "chk_stock_transfer_locations_different",
      sql`${table.sourceLocationId} <> ${table.destinationLocationId}`,
    ),
  ],
);

export const stockTransferItems = pgTable(
  "stock_transfer_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    requestedQty: integer("requested_qty").notNull(),
    dispatchedQty: integer("dispatched_qty").notNull().default(0),
    receivedQty: integer("received_qty").notNull().default(0),
    varianceQty: integer("variance_qty").notNull().default(0),
    unit: varchar("unit", { length: 20 }).notNull().default("PIECE"),
    conversionFactor: numeric("conversion_factor", {
      precision: 10,
      scale: 4,
    })
      .notNull()
      .default("1"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("idx_stock_transfer_items_transfer_id").on(table.transferId),
    index("idx_stock_transfer_items_product_id").on(table.productId),
    check("chk_stock_transfer_requested_qty_positive", sql`requested_qty > 0`),
    check(
      "chk_stock_transfer_dispatched_non_negative",
      sql`dispatched_qty >= 0`,
    ),
    check("chk_stock_transfer_received_non_negative", sql`received_qty >= 0`),
    check("chk_stock_transfer_variance_non_negative", sql`variance_qty >= 0`),
    check(
      "chk_stock_transfer_dispatched_lte_requested",
      sql`dispatched_qty <= requested_qty`,
    ),
    check(
      "chk_stock_transfer_received_lte_dispatched",
      sql`received_qty + variance_qty <= dispatched_qty`,
    ),
    check(
      "chk_stock_transfer_conversion_positive",
      sql`conversion_factor > 0`,
    ),
  ],
);

export const stockTransferReceipts = pgTable(
  "stock_transfer_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    transferId: uuid("transfer_id")
      .notNull()
      .references(() => stockTransfers.id, { onDelete: "cascade" }),
    transferItemId: uuid("transfer_item_id")
      .notNull()
      .references(() => stockTransferItems.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id),
    receivedQty: integer("received_qty").notNull(),
    inventoryQty: integer("inventory_qty").notNull(),
    notes: varchar("notes", { length: 500 }),
    receivedByUserId: uuid("received_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "set null" }),
    idempotencyKey: varchar("idempotency_key", { length: 255 })
      .notNull()
      .unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_stock_transfer_receipts_transfer_id").on(table.transferId),
    index("idx_stock_transfer_receipts_item_id").on(table.transferItemId),
    index("idx_stock_transfer_receipts_inventory").on(
      table.productId,
      table.locationId,
    ),
    check("chk_stock_transfer_receipt_qty_positive", sql`received_qty > 0`),
    check(
      "chk_stock_transfer_receipt_inventory_positive",
      sql`inventory_qty > 0`,
    ),
  ],
);
