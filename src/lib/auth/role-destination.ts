import type { UserRole } from "@/types/domain";

export function resolveRoleDestination(
  role: UserRole | null | undefined,
): string {
  switch (role) {
    case "admin":
      return "/admin/schedules";
    case "receptionist":
      return "/receptionist/day-view";
    case "patient":
      return "/my-appointments";
    case "provider":
    default:
      return "/dashboard";
  }
}
