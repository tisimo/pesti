import { Mapper } from "../core/infra/Mapper";
import { Permission, PermissionApplication, PermissionCategory, PermissionStatus } from "../domain/Permission";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import IPermissionDTO from "../dto/IPermissionDTO";

export interface PermissionPersistence {
  permissionId: string;
  name: string;
  status: PermissionStatus;
  category: PermissionCategory;
  application?: PermissionApplication;
}

export default class PermissionMapper extends Mapper<Permission> {
  public static toDTO(permission: Permission): IPermissionDTO {
    return {
      id: permission.id,
      name: permission.name,
      status: permission.status,
      category: permission.category,
      application: permission.application,
    };
  }

  public static toDomain(raw: PermissionPersistence): Permission {
    const result = Permission.create(
      {
        name: raw.name,
        status: raw.status ?? "ACTIVE",
        category: raw.category ?? "view",
        application: raw.application ?? (raw.category === "admin" ? "backoffice" : "just_causes"),
      },
      new UniqueEntityID(raw.permissionId)
    );
    if (result.isFailure) {
      throw new Error(`Failed to reconstruct Permission: ${result.error}`);
    }
    return result.getValue();
  }

  public static toPersistence(permission: Permission): PermissionPersistence {
    return {
      permissionId: permission.id,
      name: permission.name,
      status: permission.status,
      category: permission.category,
      application: permission.application,
    };
  }
}
