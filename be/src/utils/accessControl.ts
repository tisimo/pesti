import Role from "../domain/Role";
import { Permission } from "../domain/Permission";

export const SUPER_ADMIN_ROLE_NAME = "Super Admin";
export const BACKOFFICE_ADMIN_ROLE_NAME = "Backoffice Admin";

export interface RoleSummary {
  roleId: string;
  name: string;
  application: string;
  isDefault: boolean;
}

export interface EffectiveAccess {
  roles: RoleSummary[];
  primaryRole: RoleSummary | null;
  permissions: string[];
  permissionsByApplication: Record<string, string[]>;
  appsAccessible: string[];
  isSuperAdmin: boolean;
}

function addPermission(
  permissionsByApplication: Record<string, Set<string>>,
  permission: Permission,
): void {
  const app = permission.application;
  if (!permissionsByApplication[app]) permissionsByApplication[app] = new Set<string>();
  permissionsByApplication[app].add(permission.name);
}

function toPlainPermissions(input: Record<string, Set<string>>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(input).map(([application, permissions]) => [
      application,
      Array.from(permissions).sort(),
    ]),
  );
}

export function buildEffectiveAccess(assignedRoles: Role[], allPermissions: Permission[]): EffectiveAccess {
  const roles = assignedRoles.filter(role => !role.isDefault);
  const permissionByName = new Map(allPermissions.map(permission => [permission.name, permission]));
  const permissionsByApplicationSets: Record<string, Set<string>> = {};
  const backofficeRole = roles.find(role => role.application === "backoffice") ?? null;
  const isSuperAdmin = roles.some(role => role.name === SUPER_ADMIN_ROLE_NAME);

  if (isSuperAdmin) {
    allPermissions.forEach(permission => addPermission(permissionsByApplicationSets, permission));
  } else if (backofficeRole) {
    allPermissions
      .filter(permission => permission.application !== "backoffice")
      .forEach(permission => addPermission(permissionsByApplicationSets, permission));

    backofficeRole.permissions.forEach(rolePermission => {
      const permission = permissionByName.get(rolePermission.name);
      if (permission?.application === "backoffice") {
        addPermission(permissionsByApplicationSets, permission);
      }
    });
  } else {
    roles.forEach(role => {
      role.permissions.forEach(rolePermission => {
        const permission = permissionByName.get(rolePermission.name);
        if (permission?.application === role.application) {
          addPermission(permissionsByApplicationSets, permission);
        }
      });
    });
  }

  const permissionsByApplication = toPlainPermissions(permissionsByApplicationSets);
  const permissions = Array.from(
    new Set(Object.values(permissionsByApplication).flat()),
  ).sort();
  const appSet = new Set<string>();

  if (backofficeRole) {
    appSet.add("backoffice");
    allPermissions
      .map(permission => permission.application)
      .filter(application => application !== "backoffice")
      .forEach(application => appSet.add(application));
  } else {
    roles.forEach(role => appSet.add(role.application));
  }

  const roleSummaries = roles.map(role => ({
    roleId: role.roleId,
    name: role.name,
    application: role.application,
    isDefault: role.isDefault,
  }));
  const primary = backofficeRole ?? roles[0] ?? null;

  return {
    roles: roleSummaries,
    primaryRole: primary
      ? {
          roleId: primary.roleId,
          name: primary.name,
          application: primary.application,
          isDefault: primary.isDefault,
        }
      : null,
    permissions,
    permissionsByApplication,
    appsAccessible: Array.from(appSet),
    isSuperAdmin,
  };
}
