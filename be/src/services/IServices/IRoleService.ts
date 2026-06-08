import Role from "../../domain/Role";

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissions?: string[];
  application?: string;
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
  application?: string;
}

export default interface IRoleService {
  create(input: CreateRoleInput): Promise<Role>;
  getAll(): Promise<Role[]>;
  getById(id: string): Promise<Role>;
  addPermission(id: string, permissionId: string): Promise<Role>;
  update(id: string, input: UpdateRoleInput): Promise<Role>;
  delete(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  reactivate(id: string): Promise<void>;
  purgeInactive(): Promise<number>;
}
