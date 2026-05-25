// Audit module was removed — provide no-op stubs

export function logAction(_params: {
  orgId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}) {
  // No-op: audit logging removed
}

export async function queryAuditLog(_params: {
  orgId: string;
  entityType?: string;
  entityId?: string;
  cursor?: string;
  limit?: number;
}): Promise<{ data: never[]; nextCursor: null; hasMore: false }> {
  return { data: [], nextCursor: null, hasMore: false };
}
