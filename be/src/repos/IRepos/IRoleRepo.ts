import { Repo } from "../../core/infra/Repo";
import Role from "../../domain/Role";

export default interface IRoleRepo extends Repo<Role> {
  findAll(): Promise<Role[]>;
  findAllInactive(): Promise<Role[]>;
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  create(Role: Role): Promise<Role>;
  update(Role: Role): Promise<Role>;
  delete(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  reactivate(id: string): Promise<void>;
  findDefault(): Promise<Role | null>;
  removePermissionFromAll(permissionName: string): Promise<void>;
  renamePermissionInAll(oldName: string, newName: string): Promise<void>;
}
