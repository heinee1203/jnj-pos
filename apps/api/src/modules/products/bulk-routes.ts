import type { FastifyInstance } from "fastify";
import { db } from "@jnj/database";
import { inventory, products } from "@jnj/database/schema";
import { and, eq, inArray, sql } from "drizzle-orm";

import { logAction } from "./product-audit-service";
import { MANAGE_ROLES } from "./permissions";
import { buildBulkProductFilterConditions, isUuid } from "./query";
import {
  buildBulkProductUpdateFields,
  buildPostgresUuidArrayLiteral,
  getBulkProductIdsLimitError,
  resolveBulkFindReplaceColumn,
  type BulkProductUpdateInput,
} from "./bulk-helpers";

export function registerProductBulkRoutes(app: FastifyInstance) {
  app.post("/cleanup-seeded", async (request, reply) => {
    const role = (request.user as any)?.role;
    if (role !== "ADMIN") {
      return reply.status(403).send({ error: "Admin role required" });
    }

    const { orgId } = request.storeContext!;
    const body = (request.body ?? {}) as { confirm?: string; dryRun?: boolean };
    if (body.confirm !== "DELETE SEEDED PRODUCTS") {
      return reply.status(400).send({ error: "Confirmation phrase required" });
    }

    const seededSkuPattern = "^(SCH|OFF|ART|GEN|BAG|ELE)-[0-9]{6}$";
    const [summary] = (await db.execute(sql`
      WITH seeded AS (
        SELECT id
        FROM products
        WHERE org_id = ${orgId}
          AND sku ~ ${seededSkuPattern}
      )
      SELECT
        (SELECT COUNT(*)::int FROM seeded) AS product_count,
        (SELECT COUNT(*)::int FROM inventory WHERE product_id IN (SELECT id FROM seeded)) AS inventory_count,
        (SELECT COUNT(*)::int FROM sale_lines WHERE product_id IN (SELECT id FROM seeded)) AS sale_line_count,
        (SELECT COUNT(*)::int FROM po_lines WHERE product_id IN (SELECT id FROM seeded)) AS po_line_count,
        (SELECT COUNT(*)::int FROM po_receipt_events WHERE product_id IN (SELECT id FROM seeded)) AS po_receipt_event_count
    `)) as any[];

    const productCount = Number(summary?.product_count ?? 0);
    const inventoryCount = Number(summary?.inventory_count ?? 0);
    const referenceCount =
      Number(summary?.sale_line_count ?? 0) +
      Number(summary?.po_line_count ?? 0) +
      Number(summary?.po_receipt_event_count ?? 0);

    if (body.dryRun) {
      return reply.send({
        productCount,
        inventoryCount,
        referenceCount,
        saleLineCount: Number(summary?.sale_line_count ?? 0),
        poLineCount: Number(summary?.po_line_count ?? 0),
        poReceiptEventCount: Number(summary?.po_receipt_event_count ?? 0),
      });
    }

    if (referenceCount > 0) {
      const result = await db.transaction(async (tx) => {
        const [deletedInventory] = (await tx.execute(sql`
          WITH seeded AS (
            SELECT id
            FROM products
            WHERE org_id = ${orgId}
              AND sku ~ ${seededSkuPattern}
          ),
          deleted AS (
            DELETE FROM inventory
            WHERE product_id IN (SELECT id FROM seeded)
            RETURNING id
          )
          SELECT COUNT(*)::int AS deleted_inventory_count FROM deleted
        `)) as any[];

        const [deactivatedProducts] = (await tx.execute(sql`
          WITH seeded AS (
            SELECT id
            FROM products
            WHERE org_id = ${orgId}
              AND sku ~ ${seededSkuPattern}
          ),
          updated AS (
            UPDATE products
            SET is_active = false, updated_at = NOW()
            WHERE id IN (SELECT id FROM seeded)
            RETURNING id
          )
          SELECT COUNT(*)::int AS deactivated_product_count FROM updated
        `)) as any[];

        return {
          deletedProducts: 0,
          deletedInventory: Number(deletedInventory?.deleted_inventory_count ?? 0),
          deactivatedProducts: Number(deactivatedProducts?.deactivated_product_count ?? 0),
        };
      });

      logAction({
        orgId,
        userId: (request.user as any).userId,
        action: "SEEDED_PRODUCTS_CLEANUP",
        entityType: "PRODUCT",
        details: { ...result, referenceCount, mode: "deactivate-with-inventory-delete" },
        ipAddress: request.ip,
      });

      return reply.send({
        ...result,
        referenceCount,
        mode: "deactivate-with-inventory-delete",
      });
    }

    const result = await db.transaction(async (tx) => {
      const [deletedProducts] = (await tx.execute(sql`
        WITH seeded AS (
          SELECT id
          FROM products
          WHERE org_id = ${orgId}
            AND sku ~ ${seededSkuPattern}
        ),
        deleted AS (
          DELETE FROM products
          WHERE id IN (SELECT id FROM seeded)
          RETURNING id
        )
        SELECT COUNT(*)::int AS deleted_product_count FROM deleted
      `)) as any[];

      return {
        deletedProducts: Number(deletedProducts?.deleted_product_count ?? 0),
        deletedInventory: inventoryCount,
        deactivatedProducts: 0,
      };
    });

    logAction({
      orgId,
      userId: (request.user as any).userId,
      action: "SEEDED_PRODUCTS_CLEANUP",
      entityType: "PRODUCT",
      details: { ...result, referenceCount, mode: "hard-delete" },
      ipAddress: request.ip,
    });

    return reply.send({
      ...result,
      referenceCount,
      mode: "hard-delete",
    });
  });

  app.patch("/bulk-update", async (request, reply) => {
    const role = (request.user as any)?.role;
    if (!MANAGE_ROLES.includes(role)) {
      return reply.status(403).send({ error: "Admin or Manager role required" });
    }

    const { orgId } = request.storeContext!;
    const body = request.body as {
      productIds?: string[];
      filter?: { search?: string; categoryId?: string; brandId?: string };
      updates: BulkProductUpdateInput;
    };

    if (!body.updates || Object.keys(body.updates).length === 0) {
      return reply.status(400).send({ error: "No updates provided" });
    }

    const updateFields = buildBulkProductUpdateFields(body.updates);

    let updated = 0;

    if (body.productIds && body.productIds.length > 0) {
      const limitError = getBulkProductIdsLimitError(body.productIds, 500);
      if (limitError) return reply.status(400).send({ error: limitError });

      const result = await db
        .update(products)
        .set(updateFields)
        .where(and(
          eq(products.orgId, orgId),
          inArray(products.id, body.productIds),
        ));
      updated = (result as any).rowCount ?? body.productIds.length;
    } else if (body.filter) {
      const conditions = buildBulkProductFilterConditions(orgId, body.filter);

      const result = await db
        .update(products)
        .set(updateFields)
        .where(and(...conditions));

      updated = (result as any).rowCount ?? 0;
    } else {
      return reply.status(400).send({ error: "Provide productIds or filter" });
    }

    logAction({ orgId, userId: (request.user as any).userId, action: "PRODUCT_BULK_UPDATE", entityType: "PRODUCT", details: { count: updated, updates: Object.keys(body.updates) }, ipAddress: request.ip });
    return reply.send({ updated });
  });

  app.post("/bulk-find-replace", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { role } = request.user;
    if (!["ADMIN", "MANAGER"].includes(role)) {
      return reply.status(403).send({ error: "Admin or Manager required" });
    }

    const body = request.body as {
      productIds: string[];
      find: string;
      replace: string;
      fields: string[];
      caseSensitive?: boolean;
    };

    if (!body.find || body.find.length === 0) {
      return reply.status(400).send({ error: "Find string is required" });
    }
    if (!body.productIds || body.productIds.length === 0) {
      return reply.status(400).send({ error: "Select products first" });
    }
    if (body.productIds.length > 5000) {
      return reply.status(400).send({ error: "Maximum 5000 items per request" });
    }

    const fields = body.fields || ["name"];
    const find = body.find;
    const replace = body.replace ?? "";
    let totalUpdated = 0;

    for (const pid of body.productIds) {
      if (!isUuid(pid)) return reply.status(400).send({ error: `Invalid product ID: ${pid}` });
    }

    for (const field of fields) {
      const col = resolveBulkFindReplaceColumn(field);
      if (!col) continue;

      const likePattern = "%" + find + "%";
      const matchOp = body.caseSensitive ? "LIKE" : "ILIKE";
      const idsArray = buildPostgresUuidArrayLiteral(body.productIds);

      const [countResult] = await db.execute(
        sql`SELECT COUNT(*)::int as cnt FROM products
            WHERE org_id = ${orgId}
            AND ${sql.raw(col)} ${sql.raw(matchOp)} ${likePattern}
            AND id = ANY(${idsArray}::uuid[])`,
      );

      if ((countResult as any).cnt > 0) {
        await db.execute(
          sql`UPDATE products
              SET ${sql.raw(col)} = REPLACE(${sql.raw(col)}, ${find}, ${replace})
              WHERE org_id = ${orgId}
              AND ${sql.raw(col)} ${sql.raw(matchOp)} ${likePattern}
              AND id = ANY(${idsArray}::uuid[])`,
        );
      }
      totalUpdated += (countResult as any).cnt ?? 0;
    }

    return reply.send({ updated: totalUpdated });
  });

  app.patch("/bulk-available-for-sale", async (request, reply) => {
    const role = (request.user as any)?.role;
    if (!MANAGE_ROLES.includes(role)) {
      return reply.status(403).send({ error: "Admin or Manager role required" });
    }

    const { orgId } = request.storeContext!;
    const body = request.body as {
      productIds?: string[];
      filter?: { search?: string; categoryId?: string; brandId?: string };
      action: "set" | "add" | "remove";
      locationIds: string[];
    };

    if (!body.action || !body.locationIds || body.locationIds.length === 0) {
      return reply.status(400).send({ error: "action and locationIds are required" });
    }

    let productIds: string[] = [];
    if (body.productIds && body.productIds.length > 0) {
      const limitError = getBulkProductIdsLimitError(body.productIds, 500);
      if (limitError) return reply.status(400).send({ error: limitError });
      productIds = body.productIds;
    } else if (body.filter) {
      const conditions = buildBulkProductFilterConditions(orgId, body.filter);

      const rows = await db
        .select({ id: products.id })
        .from(products)
        .where(and(...conditions))
        .limit(500);
      productIds = rows.map((r) => r.id);
    } else {
      return reply.status(400).send({ error: "Provide productIds or filter" });
    }

    if (productIds.length === 0) {
      return reply.send({ updated: 0 });
    }

    let updated = 0;

    if (body.action === "set") {
      await db
        .update(inventory)
        .set({ availableForSale: false })
        .where(and(
          eq(inventory.orgId, orgId),
          inArray(inventory.productId, productIds),
        ));
      const result = await db
        .update(inventory)
        .set({ availableForSale: true })
        .where(and(
          eq(inventory.orgId, orgId),
          inArray(inventory.productId, productIds),
          inArray(inventory.locationId, body.locationIds),
        ));
      updated = (result as any).rowCount ?? 0;
    } else if (body.action === "add") {
      const result = await db
        .update(inventory)
        .set({ availableForSale: true })
        .where(and(
          eq(inventory.orgId, orgId),
          inArray(inventory.productId, productIds),
          inArray(inventory.locationId, body.locationIds),
        ));
      updated = (result as any).rowCount ?? 0;
    } else if (body.action === "remove") {
      const result = await db
        .update(inventory)
        .set({ availableForSale: false })
        .where(and(
          eq(inventory.orgId, orgId),
          inArray(inventory.productId, productIds),
          inArray(inventory.locationId, body.locationIds),
        ));
      updated = (result as any).rowCount ?? 0;
    }

    return reply.send({ updated, productCount: productIds.length });
  });
}
