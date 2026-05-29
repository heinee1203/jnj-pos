import type { FastifyPluginAsync } from "fastify";
import {
  createTransferSchema,
  dispatchTransferSchema,
  receiveTransferSchema,
  transferActionSchema,
  varianceTransferSchema,
} from "@jnj/types";
import {
  approveTransfer,
  cancelTransfer,
  createTransfer,
  dispatchTransfer,
  getTransferById,
  getTransferByNumber,
  listTransfers,
  receiveTransfer,
  reportTransferVariance,
  startPickingTransfer,
} from "./service";
import { isContentionError, isIdempotencyError } from "../procurement/route-support";

function handleTransferError(reply: any, err: any) {
  if (isIdempotencyError(err)) {
    return reply.status(409).send({ error: "Operation already processed" });
  }
  if (isContentionError(err)) {
    return reply.status(423).send({ error: "Transfer is locked, try again" });
  }
  return reply.status(400).send({ error: err.message ?? "Transfer failed" });
}

export const transferRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { userId, role } = request.user;
    const parsed = createTransferSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: "Validation failed", details: parsed.error.flatten() });
    }

    try {
      const result = await createTransfer(parsed.data, orgId, userId, role);
      return reply.status(201).send(result);
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });

  app.get("/", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const q = request.query as Record<string, string | undefined>;
    const limit = q.limit ? Number.parseInt(q.limit, 10) : 50;
    return reply.send(
      await listTransfers(orgId, {
        limit: Number.isFinite(limit) ? limit : 50,
        cursor: q.cursor,
      }),
    );
  });

  app.get("/by-number/:transferNo", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { transferNo } = request.params as { transferNo: string };
    const result = await getTransferByNumber(transferNo, orgId);
    if (!result) {
      return reply.status(404).send({ error: "Transfer order not found" });
    }
    return reply.send(result);
  });

  app.get("/:id", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { id } = request.params as { id: string };
    const result = await getTransferById(id, orgId);
    if (!result) {
      return reply.status(404).send({ error: "Transfer order not found" });
    }
    return reply.send(result);
  });

  app.post("/:id/approve", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { userId, role } = request.user;
    const { id } = request.params as { id: string };
    const parsed = transferActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await approveTransfer(id, orgId, userId, role, parsed.data));
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });

  app.post("/:id/start-picking", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { role } = request.user;
    const { id } = request.params as { id: string };
    const parsed = transferActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await startPickingTransfer(id, orgId, role, parsed.data));
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });

  app.post("/:id/dispatch", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { userId, role } = request.user;
    const { id } = request.params as { id: string };
    const parsed = dispatchTransferSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await dispatchTransfer(id, orgId, userId, role, parsed.data));
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });

  app.post("/:id/receive", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { userId, role } = request.user;
    const { id } = request.params as { id: string };
    const parsed = receiveTransferSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await receiveTransfer(id, orgId, userId, role, parsed.data));
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });

  app.post("/:id/report-variance", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { userId, role } = request.user;
    const { id } = request.params as { id: string };
    const parsed = varianceTransferSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await reportTransferVariance(id, orgId, userId, role, parsed.data));
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });

  app.post("/:id/cancel", async (request, reply) => {
    const { orgId } = request.storeContext!;
    const { role } = request.user;
    const { id } = request.params as { id: string };
    const parsed = transferActionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: "Validation failed", details: parsed.error.flatten() });
    }
    try {
      return reply.send(await cancelTransfer(id, orgId, role, parsed.data));
    } catch (err: any) {
      return handleTransferError(reply, err);
    }
  });
};
