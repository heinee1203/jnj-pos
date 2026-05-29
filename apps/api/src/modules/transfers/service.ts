import { db, type DbOrTx } from "@jnj/database";
import {
  inventory,
  locations,
  products,
  stockJournal,
  stockTransferItems,
  stockTransferReceipts,
  stockTransfers,
} from "@jnj/database/schema";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type {
  CreateTransferInput,
  DispatchTransferInput,
  ReceiveTransferInput,
  TransferActionInput,
  VarianceTransferInput,
} from "@jnj/types";
import { assertProcurementRole } from "../procurement/route-support";

type TransferStatus =
  | "DRAFT"
  | "APPROVED"
  | "PICKING"
  | "DISPATCHED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CLOSED_WITH_VARIANCE"
  | "CANCELLED";

type LockedInventoryRow = {
  id: string;
  stockLevel: number;
  reservedLevel: number;
};

function normalizeUnit(unit: string | null | undefined) {
  const value = (unit ?? "PIECE").trim().toUpperCase();
  return value || "PIECE";
}

function numeric(value: unknown, fallback = 0) {
  const parsed = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInventoryQty(qty: number, conversionFactor: unknown) {
  const factor = numeric(conversionFactor, 1);
  const inventoryQty = Math.round(qty * factor);
  if (inventoryQty <= 0) {
    throw new Error("Transfer quantity must convert to at least 1 inventory unit");
  }
  return inventoryQty;
}

function toTransferNo(row: { transferNo: string } | undefined) {
  const current = row?.transferNo?.match(/TO-(\d+)/)?.[1];
  const next = (current ? Number.parseInt(current, 10) : 0) + 1;
  return `TO-${String(next).padStart(6, "0")}`;
}

async function generateTransferNo(tx: DbOrTx, orgId: string) {
  const [latest] = await tx
    .select({ transferNo: stockTransfers.transferNo })
    .from(stockTransfers)
    .where(eq(stockTransfers.orgId, orgId))
    .orderBy(desc(stockTransfers.transferNo))
    .limit(1);

  return toTransferNo(latest);
}

async function lockInventoryRow(
  tx: DbOrTx,
  orgId: string,
  productId: string,
  locationId: string,
): Promise<LockedInventoryRow> {
  await tx.execute(
    sql`INSERT INTO inventory (id, org_id, product_id, location_id, stock_level, reserved_level, reorder_point, lead_time_days, created_at, updated_at)
        VALUES (gen_random_uuid(), ${orgId}, ${productId}, ${locationId}, 0, 0, 10, 7, NOW(), NOW())
        ON CONFLICT (product_id, location_id) DO NOTHING`,
  );

  const rows = await tx.execute(
    sql`SELECT id, stock_level, reserved_level
        FROM inventory
        WHERE org_id = ${orgId}
          AND product_id = ${productId}
          AND location_id = ${locationId}
        FOR UPDATE`,
  );

  const row = rows[0] as any;
  if (!row) {
    throw new Error("Inventory row could not be locked");
  }

  return {
    id: row.id,
    stockLevel: Number(row.stock_level),
    reservedLevel: Number(row.reserved_level),
  };
}

async function lockTransfer(tx: DbOrTx, transferId: string, orgId: string) {
  const rows = await tx.execute(
    sql`SELECT *
        FROM stock_transfers
        WHERE id = ${transferId}
          AND org_id = ${orgId}
        FOR UPDATE`,
  );

  const transfer = rows[0] as any;
  if (!transfer) {
    throw new Error("Transfer order not found");
  }
  return transfer;
}

async function lockTransferItems(tx: DbOrTx, transferId: string, orgId: string) {
  const rows = await tx.execute(
    sql`SELECT *
        FROM stock_transfer_items
        WHERE transfer_id = ${transferId}
          AND org_id = ${orgId}
        ORDER BY created_at ASC
        FOR UPDATE`,
  );

  return rows as any[];
}

function resolveCreateLineFactor(
  line: CreateTransferInput["lines"][number],
  product: any,
) {
  if (line.conversionFactor && line.conversionFactor > 0) {
    return line.conversionFactor;
  }

  const unit = normalizeUnit(line.unit);
  const sellingUnit = normalizeUnit(product.sellingUnit);
  const purchaseUnit = normalizeUnit(product.purchaseUnit);
  const packagingUnit = normalizeUnit(product.packagingUnit);
  const productFactor = numeric(product.conversionFactor, 1);
  const unitsPerCase = Number(product.unitsPerCase ?? 1);

  if (unit === sellingUnit) return 1;
  if (unit === purchaseUnit || unit === packagingUnit) {
    return productFactor > 1 ? productFactor : Math.max(unitsPerCase, 1);
  }
  return productFactor > 1 ? productFactor : 1;
}

function getAllowedActions(transfer: any, items: any[]) {
  const status = transfer.status as TransferStatus;
  const hasDispatched = items.some((item) => Number(item.dispatchedQty) > 0);
  const hasDispatchable = items.some(
    (item) => Number(item.remainingDispatchable) > 0,
  );
  const hasReceivable = items.some((item) => Number(item.remainingReceivable) > 0);

  if (status === "DRAFT") return ["approve", "cancel"];
  if (status === "APPROVED") {
    return ["start-picking", "dispatch", ...(hasDispatched ? [] : ["cancel"])];
  }
  if (status === "PICKING") {
    return ["dispatch", ...(hasDispatched ? [] : ["cancel"])];
  }
  if (status === "DISPATCHED" || status === "PARTIALLY_RECEIVED") {
    return [
      ...(hasDispatchable ? ["dispatch"] : []),
      ...(hasReceivable ? ["receive", "report-variance"] : []),
    ];
  }
  return [];
}

const ACTION_LABELS = {
  approve: "Approve",
  "start-picking": "Start Picking",
  dispatch: "Dispatch Stock",
  receive: "Receive Inventory",
  "report-variance": "Report Variance",
  cancel: "Cancel Transfer",
};

export async function createTransfer(
  input: CreateTransferInput,
  orgId: string,
  userId: string,
  userRole: string,
) {
  assertProcurementRole(userRole);

  if (input.sourceLocationId === input.destinationLocationId) {
    throw new Error("Source and destination must be different locations");
  }

  return db.transaction(async (tx) => {
    const transferLocations = await tx
      .select({
        id: locations.id,
        name: locations.name,
        type: locations.type,
        isActive: locations.isActive,
      })
      .from(locations)
      .where(
        and(
          eq(locations.orgId, orgId),
          inArray(locations.id, [
            input.sourceLocationId,
            input.destinationLocationId,
          ]),
        ),
      );

    if (transferLocations.length !== 2) {
      throw new Error("Source or destination location not found");
    }
    if (transferLocations.some((location) => !location.isActive)) {
      throw new Error("Transfers require active source and destination locations");
    }

    const productIds = [...new Set(input.lines.map((line) => line.productId))];
    const productRows = await tx
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        mnemonicSku: products.mnemonicSku,
        isActive: products.isActive,
        sellingUnit: products.sellingUnit,
        purchaseUnit: products.purchaseUnit,
        packagingUnit: products.packagingUnit,
        conversionFactor: products.conversionFactor,
        unitsPerCase: products.unitsPerCase,
      })
      .from(products)
      .where(and(eq(products.orgId, orgId), inArray(products.id, productIds)));

    if (productRows.length !== productIds.length) {
      throw new Error("One or more transfer items were not found");
    }

    const productById = new Map(productRows.map((product) => [product.id, product]));
    const inactiveProduct = productRows.find((product) => !product.isActive);
    if (inactiveProduct) {
      throw new Error(`Product "${inactiveProduct.name}" is inactive`);
    }

    const transferNo = await generateTransferNo(tx, orgId);
    const [transfer] = await tx
      .insert(stockTransfers)
      .values({
        orgId,
        transferNo,
        sourceLocationId: input.sourceLocationId,
        destinationLocationId: input.destinationLocationId,
        notes: input.notes ?? null,
        requestedByUserId: userId,
      })
      .returning();

    const lines = input.lines.map((line) => {
      const product = productById.get(line.productId)!;
      const unit = normalizeUnit(line.unit);
      const conversionFactor = resolveCreateLineFactor(line, product);
      return {
        orgId,
        transferId: transfer.id,
        productId: line.productId,
        requestedQty: line.requestedQty,
        unit,
        conversionFactor: String(conversionFactor),
      };
    });

    const items = await tx.insert(stockTransferItems).values(lines).returning();
    return { transfer, items };
  });
}

export async function listTransfers(
  orgId: string,
  opts: { limit?: number; cursor?: string } = {},
) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const cursorFilter = opts.cursor
    ? sql`AND st.created_at < (SELECT created_at FROM stock_transfers WHERE id = ${opts.cursor})`
    : sql``;

  const rows = await db.execute(sql`
    SELECT
      st.id,
      st.transfer_no,
      st.status,
      st.source_location_id,
      src.name AS source_location_name,
      st.destination_location_id,
      dst.name AS destination_location_name,
      st.created_at,
      COUNT(sti.id)::int AS line_count
    FROM stock_transfers st
    INNER JOIN locations src ON src.id = st.source_location_id
    INNER JOIN locations dst ON dst.id = st.destination_location_id
    LEFT JOIN stock_transfer_items sti ON sti.transfer_id = st.id
    WHERE st.org_id = ${orgId}
    ${cursorFilter}
    GROUP BY st.id, src.name, dst.name
    ORDER BY st.created_at DESC, st.id DESC
    LIMIT ${limit + 1}
  `);

  const data = rows.slice(0, limit).map((row: any) => ({
    id: row.id,
    transferNo: row.transfer_no,
    status: row.status,
    sourceLocationId: row.source_location_id,
    sourceLocationName: row.source_location_name,
    destinationLocationId: row.destination_location_id,
    destinationLocationName: row.destination_location_name,
    createdAt: row.created_at,
    lineCount: Number(row.line_count ?? 0),
  }));

  return {
    data,
    nextCursor: rows.length > limit ? data[data.length - 1]?.id ?? null : null,
    hasMore: rows.length > limit,
  };
}

export async function getTransferById(transferId: string, orgId: string) {
  const rows = await db.execute(
    sql`SELECT id FROM stock_transfers WHERE id = ${transferId} AND org_id = ${orgId}`,
  );
  if (rows.length === 0) return null;
  return buildTransferDetail(transferId, orgId);
}

export async function getTransferByNumber(transferNo: string, orgId: string) {
  const rows = await db.execute(
    sql`SELECT id FROM stock_transfers WHERE transfer_no = ${transferNo} AND org_id = ${orgId}`,
  );
  const transfer = rows[0] as any;
  if (!transfer) return null;
  return buildTransferDetail(transfer.id, orgId);
}

async function buildTransferDetail(transferId: string, orgId: string) {
  const transferRows = await db.execute(sql`
    SELECT
      st.*,
      src.name AS source_location_name,
      src.code AS source_location_code,
      src.type AS source_location_type,
      dst.name AS destination_location_name,
      dst.code AS destination_location_code,
      dst.type AS destination_location_type
    FROM stock_transfers st
    INNER JOIN locations src ON src.id = st.source_location_id
    INNER JOIN locations dst ON dst.id = st.destination_location_id
    WHERE st.id = ${transferId}
      AND st.org_id = ${orgId}
  `);

  const transfer = transferRows[0] as any;
  if (!transfer) return null;

  const itemRows = await db.execute(sql`
    SELECT
      sti.*,
      p.name AS product_name,
      p.sku,
      p.mnemonic_sku,
      p.barcode,
      p.selling_unit,
      (sti.requested_qty - sti.dispatched_qty)::int AS remaining_dispatchable,
      (sti.dispatched_qty - sti.received_qty - sti.variance_qty)::int AS remaining_receivable
    FROM stock_transfer_items sti
    INNER JOIN products p ON p.id = sti.product_id
    WHERE sti.transfer_id = ${transferId}
      AND sti.org_id = ${orgId}
    ORDER BY sti.created_at ASC
  `);

  const items = itemRows.map((item: any) => ({
    id: item.id,
    transferId: item.transfer_id,
    productId: item.product_id,
    requestedQty: Number(item.requested_qty),
    dispatchedQty: Number(item.dispatched_qty),
    receivedQty: Number(item.received_qty),
    varianceQty: Number(item.variance_qty),
    unit: normalizeUnit(item.unit),
    conversionFactor: Number(item.conversion_factor),
    inventoryRequestedQty: toInventoryQty(
      Number(item.requested_qty),
      item.conversion_factor,
    ),
    mnemonicSku: item.mnemonic_sku,
    productName: item.product_name,
    sku: item.sku,
    barcode: item.barcode,
    sellingUnit: normalizeUnit(item.selling_unit),
    remainingDispatchable: Number(item.remaining_dispatchable),
    remainingReceivable: Number(item.remaining_receivable),
    createdAt: item.created_at,
  }));

  const receiptRows = await db.execute(sql`
    SELECT *
    FROM stock_transfer_receipts
    WHERE transfer_id = ${transferId}
      AND org_id = ${orgId}
    ORDER BY created_at ASC
  `);

  const detail = {
    id: transfer.id,
    orgId: transfer.org_id,
    transferNo: transfer.transfer_no,
    sourceLocationId: transfer.source_location_id,
    destinationLocationId: transfer.destination_location_id,
    status: transfer.status,
    notes: transfer.notes,
    requestedByUserId: transfer.requested_by_user_id,
    approvedByUserId: transfer.approved_by_user_id,
    dispatchedByUserId: transfer.dispatched_by_user_id,
    receivedByUserId: transfer.received_by_user_id,
    approvedAt: transfer.approved_at,
    dispatchedAt: transfer.dispatched_at,
    completedAt: transfer.completed_at,
    createdAt: transfer.created_at,
    updatedAt: transfer.updated_at,
    sourceLocation: {
      id: transfer.source_location_id,
      name: transfer.source_location_name,
      code: transfer.source_location_code,
      type: transfer.source_location_type,
    },
    destinationLocation: {
      id: transfer.destination_location_id,
      name: transfer.destination_location_name,
      code: transfer.destination_location_code,
      type: transfer.destination_location_type,
    },
    items,
    receipts: receiptRows.map((receipt: any) => ({
      id: receipt.id,
      transferItemId: receipt.transfer_item_id,
      productId: receipt.product_id,
      locationId: receipt.location_id,
      receivedQty: Number(receipt.received_qty),
      inventoryQty: Number(receipt.inventory_qty),
      notes: receipt.notes,
      receivedByUserId: receipt.received_by_user_id,
      createdAt: receipt.created_at,
    })),
  };

  return {
    ...detail,
    allowedActions: getAllowedActions(detail, items),
    actionLabels: ACTION_LABELS,
  };
}

export async function approveTransfer(
  transferId: string,
  orgId: string,
  userId: string,
  userRole: string,
  input: TransferActionInput,
) {
  assertProcurementRole(userRole);

  return db.transaction(async (tx) => {
    const transfer = await lockTransfer(tx, transferId, orgId);
    if (transfer.status !== "DRAFT") {
      throw new Error(`Cannot approve a transfer in ${transfer.status} status`);
    }

    await tx
      .update(stockTransfers)
      .set({
        status: "APPROVED",
        approvedByUserId: userId,
        approvedAt: new Date(),
        notes: input.notes ?? transfer.notes,
        idempotencyKey: input.idempotencyKey,
      })
      .where(eq(stockTransfers.id, transferId));
  });

  return getTransferById(transferId, orgId);
}

export async function startPickingTransfer(
  transferId: string,
  orgId: string,
  userRole: string,
  input: TransferActionInput,
) {
  assertProcurementRole(userRole);

  return db.transaction(async (tx) => {
    const transfer = await lockTransfer(tx, transferId, orgId);
    if (transfer.status !== "APPROVED") {
      throw new Error(`Cannot start picking a transfer in ${transfer.status} status`);
    }

    await tx
      .update(stockTransfers)
      .set({
        status: "PICKING",
        notes: input.notes ?? transfer.notes,
        idempotencyKey: input.idempotencyKey,
      })
      .where(eq(stockTransfers.id, transferId));
  });

  return getTransferById(transferId, orgId);
}

export async function dispatchTransfer(
  transferId: string,
  orgId: string,
  userId: string,
  userRole: string,
  input: DispatchTransferInput,
) {
  assertProcurementRole(userRole);

  return db.transaction(async (tx) => {
    const transfer = await lockTransfer(tx, transferId, orgId);
    if (
      !["APPROVED", "PICKING", "DISPATCHED", "PARTIALLY_RECEIVED"].includes(
        transfer.status,
      )
    ) {
      throw new Error(`Cannot dispatch a transfer in ${transfer.status} status`);
    }

    const items = await lockTransferItems(tx, transferId, orgId);
    const itemById = new Map(items.map((item) => [item.id, item]));

    for (const line of input.lines) {
      const item = itemById.get(line.transferItemId);
      if (!item) {
        throw new Error(`Transfer line ${line.transferItemId} was not found`);
      }

      const remaining = Number(item.requested_qty) - Number(item.dispatched_qty);
      if (line.dispatchQty > remaining) {
        throw new Error(
          `Dispatch quantity for ${item.id} exceeds remaining quantity`,
        );
      }

      const inventoryQty = toInventoryQty(line.dispatchQty, item.conversion_factor);
      const inv = await lockInventoryRow(
        tx,
        orgId,
        item.product_id,
        transfer.source_location_id,
      );
      const available = inv.stockLevel - inv.reservedLevel;
      if (inventoryQty > available) {
        throw new Error("Source location does not have enough available stock");
      }

      const newBalance = inv.stockLevel - inventoryQty;
      await tx
        .update(inventory)
        .set({ stockLevel: newBalance })
        .where(eq(inventory.id, inv.id));

      const journalKey = `${input.idempotencyKey}:TRANSFER_OUT:${item.id}`;
      await tx.insert(stockJournal).values({
        orgId,
        productId: item.product_id,
        locationId: transfer.source_location_id,
        userId,
        actorType: "USER",
        changeQuantity: -inventoryQty,
        balanceAfter: newBalance,
        referenceType: "TRANSFER_OUT",
        referenceId: transferId,
        referenceLineId: item.id,
        idempotencyKey: journalKey,
        notes: `Transfer ${transfer.transfer_no} dispatched (${line.dispatchQty} ${normalizeUnit(item.unit)})`,
      });

      const nextDispatched = Number(item.dispatched_qty) + line.dispatchQty;
      await tx
        .update(stockTransferItems)
        .set({ dispatchedQty: nextDispatched })
        .where(eq(stockTransferItems.id, item.id));

      item.dispatched_qty = nextDispatched;
    }

    await tx
      .update(stockTransfers)
      .set({
        status: "DISPATCHED",
        dispatchedByUserId: userId,
        dispatchedAt: new Date(),
        notes: input.notes ?? transfer.notes,
        idempotencyKey: input.idempotencyKey,
      })
      .where(eq(stockTransfers.id, transferId));
  });

  return getTransferById(transferId, orgId);
}

export async function receiveTransfer(
  transferId: string,
  orgId: string,
  userId: string,
  userRole: string,
  input: ReceiveTransferInput,
) {
  assertProcurementRole(userRole);

  return db.transaction(async (tx) => {
    const transfer = await lockTransfer(tx, transferId, orgId);
    if (!["DISPATCHED", "PARTIALLY_RECEIVED"].includes(transfer.status)) {
      throw new Error(`Cannot receive a transfer in ${transfer.status} status`);
    }

    const items = await lockTransferItems(tx, transferId, orgId);
    const itemById = new Map(items.map((item) => [item.id, item]));

    for (const line of input.lines) {
      const item = itemById.get(line.transferItemId);
      if (!item) {
        throw new Error(`Transfer line ${line.transferItemId} was not found`);
      }

      const remaining =
        Number(item.dispatched_qty) -
        Number(item.received_qty) -
        Number(item.variance_qty);
      if (line.receiveQty > remaining) {
        throw new Error(
          `Receive quantity for ${item.id} exceeds dispatched quantity`,
        );
      }

      const inventoryQty = toInventoryQty(line.receiveQty, item.conversion_factor);
      const inv = await lockInventoryRow(
        tx,
        orgId,
        item.product_id,
        transfer.destination_location_id,
      );
      const newBalance = inv.stockLevel + inventoryQty;
      await tx
        .update(inventory)
        .set({ stockLevel: newBalance })
        .where(eq(inventory.id, inv.id));

      const [receipt] = await tx
        .insert(stockTransferReceipts)
        .values({
          orgId,
          transferId,
          transferItemId: item.id,
          productId: item.product_id,
          locationId: transfer.destination_location_id,
          receivedQty: line.receiveQty,
          inventoryQty,
          notes: input.notes ?? null,
          receivedByUserId: userId,
          idempotencyKey: `${input.idempotencyKey}:RECEIPT:${item.id}`,
        })
        .returning();

      await tx.insert(stockJournal).values({
        orgId,
        productId: item.product_id,
        locationId: transfer.destination_location_id,
        userId,
        actorType: "USER",
        changeQuantity: inventoryQty,
        balanceAfter: newBalance,
        referenceType: "TRANSFER_IN",
        referenceId: transferId,
        referenceLineId: item.id,
        idempotencyKey: `${input.idempotencyKey}:TRANSFER_IN:${receipt.id}`,
        notes: `Transfer ${transfer.transfer_no} received (${line.receiveQty} ${normalizeUnit(item.unit)})`,
      });

      const nextReceived = Number(item.received_qty) + line.receiveQty;
      await tx
        .update(stockTransferItems)
        .set({ receivedQty: nextReceived })
        .where(eq(stockTransferItems.id, item.id));

      item.received_qty = nextReceived;
    }

    const allRequestedAccounted = items.every(
      (item) =>
        Number(item.dispatched_qty) >= Number(item.requested_qty) &&
        Number(item.received_qty) + Number(item.variance_qty) >=
          Number(item.requested_qty),
    );
    const hasVariance = items.some((item) => Number(item.variance_qty) > 0);

    await tx
      .update(stockTransfers)
      .set({
        status: allRequestedAccounted
          ? hasVariance
            ? "CLOSED_WITH_VARIANCE"
            : "RECEIVED"
          : "PARTIALLY_RECEIVED",
        receivedByUserId: userId,
        completedAt: allRequestedAccounted ? new Date() : null,
        notes: input.notes ?? transfer.notes,
        idempotencyKey: input.idempotencyKey,
      })
      .where(eq(stockTransfers.id, transferId));
  });

  return getTransferById(transferId, orgId);
}

export async function reportTransferVariance(
  transferId: string,
  orgId: string,
  userId: string,
  userRole: string,
  input: VarianceTransferInput,
) {
  assertProcurementRole(userRole);

  return db.transaction(async (tx) => {
    const transfer = await lockTransfer(tx, transferId, orgId);
    if (!["DISPATCHED", "PARTIALLY_RECEIVED"].includes(transfer.status)) {
      throw new Error(`Cannot report variance in ${transfer.status} status`);
    }

    const items = await lockTransferItems(tx, transferId, orgId);
    const itemById = new Map(items.map((item) => [item.id, item]));

    for (const line of input.lines) {
      const item = itemById.get(line.transferItemId);
      if (!item) {
        throw new Error(`Transfer line ${line.transferItemId} was not found`);
      }

      const remaining =
        Number(item.dispatched_qty) -
        Number(item.received_qty) -
        Number(item.variance_qty);
      if (line.varianceQty > remaining) {
        throw new Error(
          `Variance quantity for ${item.id} exceeds dispatched quantity`,
        );
      }

      const nextVariance = Number(item.variance_qty) + line.varianceQty;
      await tx
        .update(stockTransferItems)
        .set({ varianceQty: nextVariance })
        .where(eq(stockTransferItems.id, item.id));

      item.variance_qty = nextVariance;
    }

    const allRequestedAccounted = items.every(
      (item) =>
        Number(item.dispatched_qty) >= Number(item.requested_qty) &&
        Number(item.received_qty) + Number(item.variance_qty) >=
          Number(item.requested_qty),
    );

    await tx
      .update(stockTransfers)
      .set({
        status: allRequestedAccounted
          ? "CLOSED_WITH_VARIANCE"
          : "PARTIALLY_RECEIVED",
        receivedByUserId: userId,
        completedAt: allRequestedAccounted ? new Date() : null,
        idempotencyKey: input.idempotencyKey,
      })
      .where(eq(stockTransfers.id, transferId));
  });

  return getTransferById(transferId, orgId);
}

export async function cancelTransfer(
  transferId: string,
  orgId: string,
  userRole: string,
  input: TransferActionInput,
) {
  assertProcurementRole(userRole);

  return db.transaction(async (tx) => {
    const transfer = await lockTransfer(tx, transferId, orgId);
    if (!["DRAFT", "APPROVED", "PICKING"].includes(transfer.status)) {
      throw new Error(`Cannot cancel a transfer in ${transfer.status} status`);
    }

    const items = await lockTransferItems(tx, transferId, orgId);
    if (items.some((item) => Number(item.dispatched_qty) > 0)) {
      throw new Error("Cannot cancel a transfer after stock has been dispatched");
    }

    await tx
      .update(stockTransfers)
      .set({
        status: "CANCELLED",
        notes: input.notes ?? transfer.notes,
        idempotencyKey: input.idempotencyKey,
      })
      .where(eq(stockTransfers.id, transferId));
  });

  return getTransferById(transferId, orgId);
}
