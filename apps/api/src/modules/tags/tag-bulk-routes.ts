import type { FastifyInstance } from "fastify";
import {
  bulkAssignBySearch,
  bulkAssignTag,
  createTag,
  listTags,
} from "./tag-route-service";
import { canManageTags, getUserRole } from "./tag-route-helpers";

export async function registerTagBulkRoutes(app: FastifyInstance) {
  app.post("/:id/bulk-assign", async (request, reply) => {
    const userRole = getUserRole(request);
    if (!canManageTags(userRole)) {
      return reply
        .status(403)
        .send({ error: "Only ADMIN or MANAGER can bulk assign tags" });
    }

    const { id } = request.params as { id: string };
    const { orgId } = request.storeContext!;
    const body = request.body as { productIds: string[] };

    if (!Array.isArray(body.productIds)) {
      return reply.status(400).send({ error: "productIds array is required" });
    }

    const result = await bulkAssignTag(orgId, id, body.productIds);
    return reply.send(result);
  });

  app.post("/bulk-assign-by-search", async (request, reply) => {
    const userRole = getUserRole(request);
    if (!canManageTags(userRole)) {
      return reply
        .status(403)
        .send({ error: "Only ADMIN or MANAGER can bulk assign tags" });
    }

    const { orgId } = request.storeContext!;
    const body = request.body as {
      tagId: string;
      searchQuery: string;
      preview?: boolean;
    };

    if (!body.tagId || !body.searchQuery) {
      return reply
        .status(400)
        .send({ error: "tagId and searchQuery are required" });
    }

    const result = await bulkAssignBySearch({
      orgId,
      tagId: body.tagId,
      searchQuery: body.searchQuery,
      preview: body.preview ?? true,
    });

    return reply.send(result);
  });

  app.post("/bulk-tag", async (request, reply) => {
    const userRole = getUserRole(request);
    if (!canManageTags(userRole)) {
      return reply
        .status(403)
        .send({ error: "Only ADMIN or MANAGER can bulk assign tags" });
    }

    const { orgId } = request.storeContext!;
    const body = request.body as {
      search?: string;
      tagId?: string;
      tagName?: string;
      tagType?: string;
    };
    const search = body.search?.trim();

    if (!search) {
      return reply.status(400).send({ error: "search is required" });
    }

    let tagId = body.tagId;
    if (!tagId) {
      const tagName = body.tagName?.trim();
      const tagType = body.tagType || "CUSTOM";
      if (!tagName) {
        return reply.status(400).send({ error: "tagId or tagName is required" });
      }

      const existingTags = await listTags({
        orgId,
        tagType,
        search: tagName,
        limit: 50,
      });
      const existing = existingTags.data.find(
        (tag) => tag.name.toLowerCase() === tagName.toLowerCase(),
      );
      tagId = existing?.id;

      if (!tagId) {
        const created = await createTag({ orgId, name: tagName, tagType });
        tagId = created.id;
      }
    }

    const result = await bulkAssignBySearch({
      orgId,
      tagId,
      searchQuery: search,
      preview: false,
    });

    const applied = result as {
      assigned?: number;
      matchCount?: number;
      skipped?: number;
    };

    return reply.send({
      data: {
        tagged: applied.assigned ?? 0,
        matched: applied.matchCount ?? 0,
        skipped: applied.skipped ?? 0,
      },
    });
  });

}
