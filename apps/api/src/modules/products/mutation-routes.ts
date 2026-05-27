import type { FastifyInstance } from "fastify";
import { db } from "@jnj/database";
import { brands, categories, inventory, priceTiers as productPriceTiers, products } from "@jnj/database/schema";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import {
  generateEan13,
  isValidBarcode,
  updateProductSchema,
  type ProductPriceTierInput,
  type VariantItem,
} from "@jnj/types";

import {
  buildVariantProductName,
  getProductMutationPermissionError,
  hasDuplicateSkus,
  isValidProductId,
  splitProductUpdatePayload,
} from "./mutation-helpers";
import { generateUniqueMnemonicSku } from "./sku";

export function registerProductUpdateRoutes(app: FastifyInstance) {
  /**
   * PATCH /products/:id
   * Update a product's editable fields. Admin/Manager only.
   */
  app.patch("/:id", async (request, reply) => {
    const userRole = (request.user as any)?.role;
    const permissionError = getProductMutationPermissionError("update", userRole);
    if (permissionError) {
      return reply.status(403).send({ error: permissionError });
    }

    const { id } = request.params as { id: string };
    const parsed = updateProductSchema.safeParse(request.body);
    if (!parsed.success) {
      console.error("PATCH /products/:id validation:", JSON.stringify(parsed.error.flatten(), null, 2));
      return reply.status(400).send({ error: "Invalid input", details: parsed.error.flatten() });
    }

    const { orgId, locationId } = request.storeContext!;
    const updates = parsed.data;

    // Verify product belongs to this org
    const [existing] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, id), eq(products.orgId, orgId)))
      .limit(1);

    if (!existing) {
      return reply.status(404).send({ error: "Product not found" });
    }

    // If barcode is changing, validate format (uniqueness not enforced — LH/RH pairs share barcodes)
    if (updates.barcode) {
      if (!isValidBarcode(updates.barcode)) {
        return reply.status(400).send({ error: "Invalid barcode format" });
      }
    }

    // Build product update set (excluding fields handled separately)
    const {
      reorderPoint,
      productUpdates,
      newVariants: rawNewVariants,
      priceTiers: rawPriceTiersUntyped,
    } = splitProductUpdatePayload(updates);
    const newVariants = rawNewVariants as VariantItem[] | undefined;
    const rawPriceTiers = rawPriceTiersUntyped as ProductPriceTierInput[] | undefined;
    const hasProductUpdates = Object.keys(productUpdates).length > 0;

    // Validate new variant SKU uniqueness
    if (newVariants && newVariants.length > 0) {
      const variantSkus = newVariants.map((v) => v.sku);
      if (hasDuplicateSkus(variantSkus)) {
        return reply.status(400).send({ error: "Variant SKUs must be unique" });
      }
      for (const vSku of variantSkus) {
        const [dup] = await db
          .select({ id: products.id })
          .from(products)
          .where(and(eq(products.orgId, orgId), eq(products.sku, vSku)))
          .limit(1);
        if (dup) {
          return reply.status(409).send({ error: `Variant SKU "${vSku}" already exists` });
        }
      }
    }

    const result = await db.transaction(async (tx) => {
      // Log price changes before update
      if (productUpdates.unitPrice !== undefined || productUpdates.costPrice !== undefined) {
        const [oldProduct] = await tx.select({ unitPrice: products.unitPrice, costPrice: products.costPrice }).from(products).where(eq(products.id, id)).limit(1);
        if (oldProduct) {
          const { logPriceChange } = await import("../pricing/price-change-logger");
          if (productUpdates.unitPrice !== undefined) {
            logPriceChange({ orgId, productId: id, field: "SELL_PRICE", oldValue: parseFloat(oldProduct.unitPrice ?? "0"), newValue: parseFloat(String(productUpdates.unitPrice)), source: "manual", changedBy: (request.user as any)?.userId });
          }
          if (productUpdates.costPrice !== undefined) {
            logPriceChange({ orgId, productId: id, field: "COST_PRICE", oldValue: parseFloat(oldProduct.costPrice ?? "0"), newValue: parseFloat(String(productUpdates.costPrice)), source: "manual", changedBy: (request.user as any)?.userId });
          }
        }
      }

      // Update product fields (re-check count since auto-fill may have added categoryId)
      if (Object.keys(productUpdates).length > 0) {
        await tx
          .update(products)
          .set(productUpdates)
          .where(eq(products.id, id));
      }

      // Update reorder point in inventory (only when a specific location is selected)
      if (reorderPoint !== undefined && locationId) {
        await tx
          .update(inventory)
          .set({ reorderPoint })
          .where(and(eq(inventory.productId, id), eq(inventory.locationId, locationId)));
      }

      // Replace unit-based prices when supplied. Existing rows are preserved
      // when the client omits priceTiers entirely.
      if (rawPriceTiers !== undefined) {
        await tx
          .delete(productPriceTiers)
          .where(and(eq(productPriceTiers.productId, id), eq(productPriceTiers.orgId, orgId)));

        if (rawPriceTiers.length > 0) {
          await tx.insert(productPriceTiers).values(
            rawPriceTiers.map((tier) => ({
              productId: id,
              orgId,
              label: tier.label.trim(),
              minQty: tier.quantity,
              maxQty: null,
              unitPrice: tier.price,
              casePrice: null,
            })),
          );
        }
      }

      // Create new variant children if provided
      const createdVariants: any[] = [];
      if (newVariants && newVariants.length > 0) {
        // Fetch parent product to inherit shared fields
        const [parent] = await tx
          .select()
          .from(products)
          .where(eq(products.id, id))
          .limit(1);

        if (parent) {
          for (const v of newVariants) {
            const childName = buildVariantProductName(parent.name, v.suffix);
            const childMnemonic = await generateUniqueMnemonicSku(orgId, childName, tx as any);
            // Generate barcode for variant
            let childBarcode = v.barcode || "";
            if (!childBarcode) {
              for (let attempt = 0; attempt < 10; attempt++) {
                const candidate = generateEan13();
                const [dup] = await tx
                  .select({ id: products.id })
                  .from(products)
                  .where(and(eq(products.orgId, orgId), eq(products.barcode, candidate)))
                  .limit(1);
                if (!dup) { childBarcode = candidate; break; }
              }
            }

            const [child] = await tx
              .insert(products)
              .values({
                orgId,
                name: childName,
                sku: v.sku,
                mnemonicSku: childMnemonic,
                category: parent.category as any,
                unitPrice: v.unitPrice || "0.00",
                costPrice: v.costPrice || "0.00",
                barcode: childBarcode || null,
                oemNumber: parent.oemNumber || null,
                isParent: false,
                parentProductId: id,
                categoryId: parent.categoryId || null,
                brandId: parent.brandId || null,
              })
              .returning();

            createdVariants.push(child);

            // Create inventory rows for the new variant
            if (locationId) {
              await tx.insert(inventory).values({
                orgId,
                productId: child.id,
                locationId,
                stockLevel: 0,
                reorderPoint: 5,
                leadTimeDays: 7,
              });
            }
          }
        }
      }

      // Return updated product with inventory data
      const [row] = await tx
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
          isActive: products.isActive,
          isParent: products.isParent,
          stockLevel: inventory.stockLevel,
          reorderPoint: inventory.reorderPoint,
          categoryId: products.categoryId,
          categoryName: categories.name,
          brandId: products.brandId,
          brandName: brands.name,
          unitsPerCase: products.unitsPerCase,
          packagingUnit: products.packagingUnit,
          sellingUnit: products.sellingUnit,
          purchaseUnit: products.purchaseUnit,
          conversionFactor: products.conversionFactor,
          primarySupplierId: products.primarySupplierId,
        })
        .from(products)
        .leftJoin(inventory, and(
          eq(inventory.productId, products.id),
          ...(locationId ? [eq(inventory.locationId, locationId)] : []),
        ))
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .leftJoin(brands, eq(products.brandId, brands.id))
        .where(eq(products.id, id))
        .limit(1);

      const tiers = await tx
        .select({
          id: productPriceTiers.id,
          label: productPriceTiers.label,
          quantity: productPriceTiers.minQty,
          price: productPriceTiers.unitPrice,
        })
        .from(productPriceTiers)
        .where(and(eq(productPriceTiers.productId, id), eq(productPriceTiers.orgId, orgId)))
        .orderBy(asc(productPriceTiers.minQty), asc(productPriceTiers.label));

      return {
        ...row,
        newVariants: createdVariants,
        priceTiers: tiers.map((tier) => ({
          id: tier.id,
          label: tier.label ?? `${tier.quantity}`,
          quantity: tier.quantity,
          price: tier.price,
        })),
      };
    });

    return reply.send(result);
  });

  /**
   * GET /products/grouped-counts
   * Aggregated counts for the drill-down inventory view.
   * Groups products by family -> category -> brand -> vehicleMake.
   */
}

export function registerProductDeleteRoutes(app: FastifyInstance) {
  /**
   * DELETE /products/:id
   * Hard-delete a product if it has no sales history, otherwise soft-delete (isActive=false).
   */
  app.delete("/:id", async (request, reply) => {
    const userRole = (request.user as any)?.role;
    const permissionError = getProductMutationPermissionError("delete", userRole);
    if (permissionError) {
      return reply.status(403).send({ error: permissionError });
    }

    const { id } = request.params as { id: string };
    const { orgId } = request.storeContext!;

    if (!isValidProductId(id)) {
      return reply.status(400).send({ error: "Invalid product ID format" });
    }

    const [existing] = await db
      .select({ id: products.id, isParent: products.isParent })
      .from(products)
      .where(and(eq(products.id, id), eq(products.orgId, orgId)))
      .limit(1);

    if (!existing) return reply.status(404).send({ error: "Product not found" });

    // Collect all product IDs to check (self + children if parent)
    const idsToCheck: string[] = [id];
    if (existing.isParent) {
      const children = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.parentProductId, id), eq(products.orgId, orgId)));
      idsToCheck.push(...children.map((c) => c.id));
    }

    // Check for non-cascading FK references across ALL affected products
    const idList = sql.join(idsToCheck.map((i) => sql`${i}`), sql`, `);
    const [hasRefs] = await db.execute(sql`
      SELECT EXISTS(
        SELECT 1 FROM sale_lines WHERE product_id IN (${idList})
        UNION ALL SELECT 1 FROM po_lines WHERE product_id IN (${idList})
        UNION ALL SELECT 1 FROM job_card_parts WHERE product_id IN (${idList})
        UNION ALL SELECT 1 FROM stock_transfer_items WHERE product_id IN (${idList})
        UNION ALL SELECT 1 FROM po_receipt_events WHERE product_id IN (${idList})
      ) AS has_refs
    `);

    if ((hasRefs as any)?.has_refs) {
      // Soft-delete: deactivate all affected products
      await db.update(products).set({ isActive: false }).where(
        inArray(products.id, idsToCheck),
      );
      return reply.send({
        message: existing.isParent
          ? "Parent and variants deactivated (has transaction history)"
          : "Product deactivated (has transaction history)",
      });
    }

    // Hard delete — CASCADE handles inventory, stock_journal, vehicle_compatibility,
    // inventory_count_lines, product_option_types, product_variant_options.
    // For parent products, CASCADE on parent_product_id deletes children first,
    // and each child's CASCADE deletes its own dependent rows.
    await db.delete(products).where(eq(products.id, id));
    return reply.status(204).send();
  });

}
