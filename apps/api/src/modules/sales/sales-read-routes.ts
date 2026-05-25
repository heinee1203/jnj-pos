import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "@jnj/database";
import { parseQuery, salesQuerySchema } from "../../lib/validate-query";
import {
  getSale,
  getSaleByIdempotencyKey,
  getSaleByNumber,
  getSaleJournal,
  listSales,
} from "./sale-read-service";

export async function registerSalesReadRoutes(app: FastifyInstance) {
  // List sales with filters, pagination, joined display fields
  app.get("/", async (request, reply) => {
    const q = parseQuery(salesQuerySchema, request.query, reply);
    if (!q) return;

    const { orgId, locationId } = request.storeContext!;
    const { role } = request.user;

    const allLocations = q.allLocations === "true" || !locationId;
    if (allLocations && !["ADMIN", "MANAGER"].includes(role)) {
      return reply
        .status(403)
        .send({ error: "Cross-location access requires ADMIN or MANAGER" });
    }

    const result = await listSales(orgId, {
      locationId: (q as any).locationId || (allLocations ? undefined : locationId),
      status: q.status?.split(",").filter(Boolean),
      from: q.from,
      to: q.to,
      q: q.q,
      employeeId: (q as any).employeeId || undefined,
      cursor: q.cursor,
      limit: q.limit,
    });

    return reply.send(result);
  });

  // Historical sales routes removed (historical_sales schema deleted)

  // Auto-increment receipt number for BIR compliance
  app.get("/next-receipt-number", async (request, reply) => {
    const { orgId } = request.storeContext!;

    const [result] = await db.execute(
      sql`SELECT receipt_number FROM sales
          WHERE org_id = ${orgId} AND receipt_number IS NOT NULL AND receipt_number LIKE 'OR-%'
          ORDER BY receipt_number DESC LIMIT 1`
    );

    let nextNum = 1;
    if (result?.receipt_number) {
      const match = (result.receipt_number as string).match(/OR-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }

    const receiptNumber = `OR-${String(nextNum).padStart(7, "0")}`;
    return reply.send({ receiptNumber });
  });

  // Resolve sale by public sale_no (for deep-linking)
  app.get("/by-number/:saleNo", async (request, reply) => {
    const { saleNo } = request.params as { saleNo: string };
    const { orgId } = request.storeContext!;

    const result = await getSaleByNumber(saleNo, orgId);
    if (!result) {
      return reply.status(404).send({ error: "Sale not found" });
    }
    return reply.send(result);
  });

  // Reconciliation lookup for mobile POS.
  app.get("/by-idempotency-key/:key", async (request, reply) => {
    const { key } = request.params as { key: string };
    const { orgId } = request.storeContext!;

    const result = await getSaleByIdempotencyKey(key, orgId);
    if (!result) {
      return reply.status(404).send({ error: "No sale found for this idempotency key" });
    }
    return reply.send(result);
  });

  // Get sale details with enriched lines
  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { orgId } = request.storeContext!;

    const result = await getSale(id, orgId);
    if (!result) {
      return reply.status(404).send({ error: "Sale not found" });
    }
    return reply.send(result);
  });

  // Get sale-related journal entries
  app.get("/:id/journal", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { orgId } = request.storeContext!;

    const entries = await getSaleJournal(id, orgId);
    return reply.send({ data: entries });
  });
}
