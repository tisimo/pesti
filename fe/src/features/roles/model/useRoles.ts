import { useState, useEffect, useCallback } from "react";
import { RolesService } from "../api/RolesService";
import type { RoleDTO, PermissionDTO } from "./types";
import { ROLE_METADATA } from "./types";

function sortByLevel(roles: RoleDTO[]): RoleDTO[] {
  return [...roles].sort((a, b) => {
    const orderA = ROLE_METADATA[a.name]?.order ?? 999;
    const orderB = ROLE_METADATA[b.name]?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name);
  });
}

export function useRoles() {
  const [roles, setRoles] = useState<RoleDTO[]>([]);
  const [permissions, setPermissions] = useState<PermissionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        RolesService.getRoles(),
        RolesService.getPermissions(),
      ]);
      setRoles(sortByLevel(rolesData));
      setPermissions(permsData.filter((p) => p.status === "ACTIVE"));
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Unknown error";
      setError(`Failed to load roles and permissions. (${msg})`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { roles, setRoles, permissions, loading, error, reload: load };
}
