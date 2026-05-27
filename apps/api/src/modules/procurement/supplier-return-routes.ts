import type { FastifyInstance } from "fastify";
import { assertProcurementRole } from "./route-support";

const emptyAnalytics = {
  pendingAging: {
    totalCount: 0,
    totalValue: 0,
    buckets: [
      { key: "0_7", label: "0-7 days", count: 0, totalValue: 0 },
      { key: "8_14", label: "8-14 days", count: 0, totalValue: 0 },
      { key: "15_30", label: "15-30 days", count: 0, totalValue: 0 },
      { key: "31_plus", label: "31+ days", count: 0, totalValue: 0 },
    ],
  },
  topSuppliers: [],
  topItems: [],
  reasonBreakdown: [],
  monthlyTotals: [],
};

function unavailableMessage() {
  return {
    error: "Supplier returns are not enabled in this deployment",
  };
}

export function registerSupplierReturnRoutes(app: FastifyInstance) {
  app.get("/supplier-returns/analytics", async (request, reply) => {
    const { role } = request.user;
    assertProcurementRole(role);

    return reply.send(emptyAnalytics);
  });

  app.get("/supplier-returns/po-returnable-lines", async (request, reply) => {
    const { role } = request.user;
    assertProcurementRole(role);

    return reply.send({ data: [] });
  });

  app.get("/supplier-returns", async (request, reply) => {
    const { role } = request.user;
    assertProcurementRole(role);

    return reply.send({ data: [], nextCursor: null, hasMore: false });
  });

  app.post("/supplier-returns", async (_request, reply) => {
    return reply.status(501).send(unavailableMessage());
  });

  app.get("/supplier-returns/:id/attachments", async (_request, reply) => {
    return reply.send({ data: [] });
  });

  app.post("/supplier-returns/:id/attachments", async (_request, reply) => {
    return reply.status(501).send(unavailableMessage());
  });

  app.delete("/supplier-returns/:id/attachments/:attachmentId", async (_request, reply) => {
    return reply.status(501).send(unavailableMessage());
  });

  app.get("/supplier-returns/:id", async (_request, reply) => {
    return reply.status(404).send({ error: "Supplier return not found" });
  });

  app.patch("/supplier-returns/:id", async (_request, reply) => {
    return reply.status(501).send(unavailableMessage());
  });

  app.delete("/supplier-returns/:id", async (_request, reply) => {
    return reply.status(501).send(unavailableMessage());
  });

  app.post("/supplier-returns/:id/:action", async (_request, reply) => {
    return reply.status(501).send(unavailableMessage());
  });
}
