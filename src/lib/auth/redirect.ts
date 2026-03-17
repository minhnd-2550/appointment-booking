export function isSafeRedirectPath(
  path: string | null | undefined,
): path is string {
  if (!path) return false;
  return (
    path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/api")
  );
}

export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback: string,
): string {
  return isSafeRedirectPath(path) ? path : fallback;
}
