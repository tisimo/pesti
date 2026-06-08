import { Mapper } from "../core/infra/Mapper";
import Role, { RoleApplication } from "../domain/Role";
import { Permission } from "../domain/Permission";
import IRoleDTO from "../dto/IRoleDTO";

interface RolePersistence {
  roleId: string;
  name: string;
  description?: string;
  permissions: string[];
  status?: string;
  application?: string;
  isDefault?: boolean;
}

export default class RoleMapper extends Mapper<Role> {
  public static toDTO(role: Role): IRoleDTO {
    return {
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.name),
      status: role.status,
      application: role.application,
      isDefault: role.isDefault,
    };
  }

  public static toDomain(raw: RolePersistence): Role {
    const rawPermissions = raw.permissions ?? [];
    const permissions = new Array(rawPermissions.length);

    for (let i = 0; i < rawPermissions.length; i++) {
      const result = Permission.create({
        name: rawPermissions[i],
        status: "ACTIVE",
        category: "view",
      });

      if (result.isFailure) {
        throw new Error(`Failed to reconstruct Role permission: ${result.error}`);
      }

      permissions[i] = result.getValue();
    }

    return Role.create({
      id: raw.roleId,
      name: raw.name,
      description: raw.description,
      permissions,
      status: (raw.status as "ACTIVE" | "INACTIVE") ?? "ACTIVE",
      application: (raw.application as RoleApplication) ?? "just_causes",
      isDefault: raw.isDefault ?? false,
    });
  }

  public static toPersistence(role: Role): RolePersistence {
    return {
      roleId: role.roleId,
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.name),
      status: role.status,
      application: role.application,
      isDefault: role.isDefault,
    };
  }
}
