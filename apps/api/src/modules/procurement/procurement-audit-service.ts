// Audit module was removed — provide no-op stub

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
