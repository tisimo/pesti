import { RolesService } from "../api/RolesService";
import type { RoleDTO, PermissionDTO } from "./types";

export function useRoleUpdate(permissions: PermissionDTO[]) {
  function resolveInitialPerms(role: RoleDTO): string[] {
    return permissions
      .filter((p) => p.application === role.application)
      .filter((p) => role.permissions.includes(p.name) || role.permissions.includes(p.id))
      .map((p) => p.name);
  }

  async function savePermissions(role: RoleDTO, draftPermNames: string[]): Promise<void> {
    const permIds = draftPermNames
      .map((name) => permissions.find((p) => p.name === name && p.application === role.application)?.id)
      .filter((id): id is string => id !== undefined);
    await RolesService.updateRole(role.roleId, { permissions: permIds });
  }

  return { resolveInitialPerms, savePermissions };
}
