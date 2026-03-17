export const AUTH_ERROR_CODES = {
  MISSING_CODE: "missing_code",
  AUTH_FAILED: "auth_failed",
  ACCESS_DENIED: "access_denied",
  ACCOUNT_DEACTIVATED: "account_deactivated",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

const authErrorMessages: Record<AuthErrorCode, string> = {
  [AUTH_ERROR_CODES.MISSING_CODE]:
    "Không nhận được mã đăng nhập. Vui lòng thử lại.",
  [AUTH_ERROR_CODES.AUTH_FAILED]: "Đăng nhập thất bại. Vui lòng thử lại.",
  [AUTH_ERROR_CODES.ACCESS_DENIED]:
    "Bạn đã hủy hoặc từ chối quyền truy cập Google.",
  [AUTH_ERROR_CODES.ACCOUNT_DEACTIVATED]:
    "Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ quản trị viên.",
  [AUTH_ERROR_CODES.INSUFFICIENT_PERMISSIONS]:
    "Tài khoản không có quyền truy cập khu vực này.",
};

export function isAuthErrorCode(
  value: string | null | undefined,
): value is AuthErrorCode {
  if (!value) return false;
  return Object.values(AUTH_ERROR_CODES).includes(value as AuthErrorCode);
}

export function getAuthErrorMessage(
  code: string | null | undefined,
): string | null {
  if (!isAuthErrorCode(code)) return null;
  return authErrorMessages[code];
}
