import { Permission } from "../../domain/Permission";

export default interface IPermissionRepo {
  findAll(): Promise<Permission[]>;
  findAllInactive(): Promise<Permission[]>;
  findById(id: string): Promise<Permission | null>;
  findByName(name: string): Promise<Permission | null>;
  create(permission: Permission): Promise<Permission>;
  update(permission: Permission): Promise<Permission>;
  delete(id: string): Promise<Permission>;
  hardDelete(id: string): Promise<void>;
  reactivate(id: string): Promise<Permission>;
}
