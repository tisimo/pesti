import { useAuth } from "@/app/providers/AuthProvider";

/**
 * Returns true if the current user has the given permission.
 * Super Admin always passes. Other roles use the effective permissions returned
 * by the backend.
 */
export function usePermission(permission: string): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === "Super Admin") return true;
  return user.permissions?.includes(permission) ?? false;
}

export function useAnyPermission(permissions: string[]): boolean {
  const { user } = useAuth();
  if (!user) return false;
  if (user.role === "Super Admin") return true;
  return permissions.some((permission) => user.permissions?.includes(permission));
}
