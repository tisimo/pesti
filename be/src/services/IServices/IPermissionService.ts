import { PermissionApplication, PermissionCategory } from "../../domain/Permission";
import IPermissionDTO from "../../dto/IPermissionDTO";

export default interface IPermissionService {
  getAll(): Promise<IPermissionDTO[]>;
  getAllInactive(): Promise<IPermissionDTO[]>;
  getById(id: string): Promise<IPermissionDTO>;
  create(name: string, category: PermissionCategory, application?: PermissionApplication): Promise<IPermissionDTO>;
  update(id: string, input: { name?: string; category?: PermissionCategory; application?: PermissionApplication }): Promise<IPermissionDTO>;
  delete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  hardDeleteAll(): Promise<number>;
  reactivate(id: string): Promise<IPermissionDTO>;
}
