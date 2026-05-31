import type { FastifyInstance } from "fastify";
import { db } from "@jnj/database";
import { products, inventory, categories, brands } from "@jnj/database/schema";
import { eq, and, sql } from "drizzle-orm";
import { listProductsQuerySchema } from "@jnj/types";

import { buildStandardProductListConditions, isGroupedProductQuery, parseProductPagination, parseProductSort, resolveProductScope } from "./query";
import { buildStableProductOrderBy } from "./sorting";
import { handleAllLocationsQuery } from "./all-locations-query";
import { handleGroupedQuery } from "./grouped-query";

export function registerProductListRoutes(app: FastifyInstance) {
  app.get("/", async (request, reply) => {
    // Audit Bug 7: strict Zod validation for every query param — unknown
    // keys (misspellings, stale callers) now 400 instead of silently
    // returning all rows. Same-class defense as AR-allocations.
    const parsed = listProductsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      console.error("GET /products validation:", JSON.stringify(parsed.error.flatten(), null, 2));
      return reply.status(400).send({ error: "Invalid query params", details: parsed.error.flatten() });
    }
    const q = parsed.data;
    const { orgId, locationId } = request.storeContext!;
    const allLocations = resolveProductScope(q, locationId);
    const { page, limit, offset } = parseProductPagination(q);
    const { sortBy, sortDir } = parseProductSort(q);
    const grouped = isGroupedProductQuery(q);

    // -- Grouped mode: deduplicate variants within families --
    if (grouped) {
      return handleGroupedQuery(
        reply,
        orgId,
        locationId,
        page,
        limit,
        offset,
        sortBy,
        sortDir,
        q.search,
        q.category,
        q.stockStatus,
        q.categoryId,
        q.brandId,
        allLocations,
        q.excludeSO === "true",
        q.excludeDC === "true",
      );
    }

    // -- All-locations aggregate mode --
    if (allLocations) {
      return handleAllLocationsQuery(
        reply, orgId, page, limit, offset, sortBy, sortDir, q,
      );
    }

    // -- Standard flat mode --
    // (allLocations check above guarantees locationId is non-null here)
    const { conditions, parentOnly } = buildStandardProductListConditions({
      q,
      orgId,
      locationId: locationId!,
      role: request.user.role,
    });

    const where = and(...conditions);

    // Count total for pagination metadata
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(inventory)
      .innerJoin(products, eq(inventory.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(where);

    // Build ORDER BY — always add products.id as tie-breaker for stable pagination
    const orderClauses = buildStableProductOrderBy(sortBy, sortDir);

    // Fetch page
    const rows = await db
      .select({
        id: products.id,
        name: products.name,
        sku: products.sku,
        mnemonicSku: products.mnemonicSku,
        category: products.category,
        unitPrice: products.unitPrice,
        costPrice: products.costPrice,
        barcode: products.barcode,
        oemNumber: products.oemNumber,
        isVariablePrice: products.isVariablePrice,
        stockLevel: parentOnly
          ? sql<number>`GREATEST(CASE WHEN ${products.isParent} THEN COALESCE((
              SELECT SUM(inv2.stock_level)::int
              FROM inventory inv2
              INNER JOIN products p2 ON inv2.product_id = p2.id
              INNER JOIN locations loc2 ON inv2.location_id = loc2.id AND loc2.is_active = true
              WHERE p2.parent_product_id = ${products.id}
              ${locationId ? sql`AND inv2.location_id = ${locationId}` : sql``}
            ), 0) ELSE ${inventory.stockLevel} END, 0)`.as("stock_level")
          : inventory.stockLevel,
        reorderPoint: inventory.reorderPoint,
        reorderPointUnit: inventory.reorderPointUnit,
        categoryId: products.categoryId,
        categoryName: categories.name,
        brandId: products.brandId,
        brandName: brands.name,
        parentProductId: products.parentProductId,
        parentName: sql<string | null>`(SELECT pp.name FROM products pp WHERE pp.id = ${products.parentProductId})`.as("parent_name"),
        isParent: products.isParent,
        unitsPerCase: products.unitsPerCase,
        packagingUnit: products.packagingUnit,
        sellingUnit: products.sellingUnit,
        purchaseUnit: products.purchaseUnit,
        conversionFactor: products.conversionFactor,
        primarySupplierId: products.primarySupplierId,
        trackInventory: products.trackInventory,
        specialOrder: products.specialOrder,
        discontinued: products.discontinued,
      })
      .from(products)
      .leftJoin(inventory, eq(inventory.productId, products.id))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .leftJoin(brands, eq(products.brandId, brands.id))
      .where(where)
      .orderBy(...orderClauses)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: rows,
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
      hasMore: page * limit < count,
    });
  });
}
