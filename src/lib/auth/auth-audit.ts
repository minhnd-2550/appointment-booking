export type AuthAuditEventType =
  | "google_login_success"
  | "google_login_failed"
  | "google_login_cancelled"
  | "google_login_blocked";

export interface AuthAuditContext {
  userId?: string | null;
  email?: string | null;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export function logAuthAuditEvent(
  eventType: AuthAuditEventType,
  context: AuthAuditContext = {},
): void {
  const payload = {
    scope: "auth",
    eventType,
    userId: context.userId ?? null,
    email: context.email ?? null,
    reason: context.reason ?? null,
    metadata: context.metadata ?? {},
    createdAt: new Date().toISOString(),
  };

  console.info("[auth-audit]", JSON.stringify(payload));
}
