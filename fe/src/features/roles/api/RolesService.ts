import { apiBackoffice } from "@/shared/lib/axios";
import type { PermissionCategory, RoleApplication, RoleDTO, PermissionDTO, PageGateDTO } from "../model/types";

export interface AdminUserSummary {
  userId: string;
  email: string;
  roleId?: string;
  roleIds?: string[];
  roles?: Array<{ roleId: string; name: string; application: RoleApplication; isDefault?: boolean }>;
  status: "ACTIVE" | "INACTIVE";
  firstName?: string;
  lastName?: string;
}

const CATEGORY_TO_INT: Record<PermissionCategory, 0 | 1 | 2> = {
  view: 0,
  action: 1,
  admin: 2,
};

export const RolesService = {
  getRoles(): Promise<RoleDTO[]> {
    return apiBackoffice.get<RoleDTO[]>("/roles").then((r) => r.data);
  },

  getPermissions(): Promise<PermissionDTO[]> {
    return apiBackoffice.get<PermissionDTO[]>("/permissions").then((r) => r.data);
  },

  createPermission(name: string, category: PermissionCategory): Promise<PermissionDTO> {
    return apiBackoffice
      .post<PermissionDTO>("/permissions", { name, category: CATEGORY_TO_INT[category] })
      .then((r) => r.data);
  },

  createRole(name: string, description?: string, application?: RoleApplication): Promise<RoleDTO> {
    return apiBackoffice.post<RoleDTO>("/roles", { name, description, application }).then((r) => r.data);
  },

  updateRole(roleId: string, data: { name?: string; permissions?: string[]; application?: RoleApplication }): Promise<RoleDTO> {
    return apiBackoffice.put<RoleDTO>(`/roles/${roleId}`, data).then((r) => r.data);
  },

  addPermissionToRole(roleId: string, permissionId: string): Promise<RoleDTO> {
    return apiBackoffice
      .post<RoleDTO>(`/roles/${roleId}/permissions`, { permissionId })
      .then((r) => r.data);
  },

  deactivateRole(roleId: string): Promise<void> {
    return apiBackoffice.patch(`/roles/${roleId}/deactivate`).then(() => undefined);
  },

  deactivatePermission(permissionId: string): Promise<void> {
    return apiBackoffice.patch(`/permissions/${permissionId}/deactivate`).then(() => undefined);
  },

  getPageGates(application?: string): Promise<PageGateDTO[]> {
    const params = application ? `?application=${application}` : "";
    return apiBackoffice.get<PageGateDTO[]>(`/page-gates${params}`).then((r) => r.data);
  },

  updatePageGate(gateId: string, requiredPermissions: string[]): Promise<PageGateDTO> {
    return apiBackoffice
      .put<PageGateDTO>(`/page-gates/${gateId}`, { requiredPermissions })
      .then((r) => r.data);
  },

  getAdminUsers(): Promise<AdminUserSummary[]> {
    return apiBackoffice.get<AdminUserSummary[]>("/users").then((r) => r.data);
  },
};
