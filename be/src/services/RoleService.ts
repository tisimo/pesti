import { Inject, Service } from "typedi";
import Role, { RoleApplication } from "../domain/Role";
import { Permission } from "../domain/Permission";
import IRoleRepo from "../repos/IRepos/IRoleRepo";
import IPermissionRepo from "../repos/IRepos/IPermissionRepo";
import IUserRepo from "../repos/IRepos/IUserRepo";
import IRoleService, { CreateRoleInput, UpdateRoleInput } from "./IServices/IRoleService";

export interface RoleServiceError {
  code: string;
  message: string;
}

const SEEDED_ROLE_IDS = new Set([
  "r0000000-0000-4000-8000-000000000001",
  "r0000001-0000-4000-8000-000000000001",
  "r0000002-0000-4000-8000-000000000001",
  "r0000003-0000-4000-8000-000000000001",
  "r0000004-0000-4000-8000-000000000001",
  "r0000005-0000-4000-8000-000000000001",
  "r0000006-0000-4000-8000-000000000001",
  "r0000007-0000-4000-8000-000000000001",
  "r0000008-0000-4000-8000-000000000001",
]);

@Service()
export default class RoleService implements IRoleService {
  constructor(
    @Inject("roleRepo")
    private readonly roleRepo: IRoleRepo,
    @Inject("permissionRepo")
    private readonly permissionRepo: IPermissionRepo,
    @Inject("userRepo")
    private readonly userRepo: IUserRepo,
  ) {}

  public async create(input: CreateRoleInput): Promise<Role> {
    const name = this.normalizeText(input.name);
    if (!name) {
      throw this.buildError("INVALID_ROLE_NAME", "Role name is required.");
    }

    const duplicated = await this.roleRepo.findByName(name);
    if (duplicated) {
      throw this.buildError("ROLE_ALREADY_EXISTS", "A role with this name already exists.");
    }

    const application = (input.application as RoleApplication) ?? "just_causes";
    const resolved = await this.resolveRolePermissions(application, input.permissions ?? []);

    const role = Role.create({
      name,
      description: input.description,
      permissions: resolved,
      application,
    });

    return this.roleRepo.create(role);
  }

  public async getAll(): Promise<Role[]> {
    return this.roleRepo.findAll();
  }

  public async getById(id: string): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
    }
    return role;
  }

  public async update(id: string, input: UpdateRoleInput): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
    }

    if (role.isDefault) {
      throw this.buildError("ROLE_PROTECTED", "The default role cannot be modified.");
    }

    if (typeof input.name !== "undefined") {
      if (SEEDED_ROLE_IDS.has(role.roleId)) {
        throw this.buildError("ROLE_PROTECTED", "Seeded role names cannot be changed.");
      }

      const name = this.normalizeText(input.name);
      if (!name) {
        throw this.buildError("INVALID_ROLE_NAME", "Role name is required.");
      }

      const duplicated = await this.roleRepo.findByName(name);
      if (duplicated && duplicated.roleId !== role.roleId) {
        throw this.buildError("ROLE_ALREADY_EXISTS", "A role with this name already exists.");
      }

      role.rename(name);
    }

    if (typeof input.description !== "undefined") {
      role.setDescription(input.description || undefined);
    }

    if (typeof input.application !== "undefined") {
      const newApplication = input.application as RoleApplication;
      for (const perm of role.permissions) {
        if (perm.application !== newApplication) {
          throw this.buildError(
            "PERMISSION_APPLICATION_MISMATCH",
            `Permission "${perm.name}" belongs to "${perm.application}" and cannot remain on a "${newApplication}" role.`,
          );
        }
      }
      role.setApplication(newApplication);
    }

    if (typeof input.permissions !== "undefined") {
      const resolved = await this.resolveRolePermissions(role.application, input.permissions);
      role.setPermissions(resolved);
    }

    return this.roleRepo.update(role);
  }

  public async addPermission(id: string, permissionId: string): Promise<Role> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
    }

    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) {
      throw this.buildError("PERMISSION_NOT_FOUND", "Permission not found.");
    }

    this.assertPermissionMatchesRoleApplication(role.application, permission);

    if (role.permissions.some(p => p.name === permission.name)) {
      throw this.buildError("PERMISSION_ALREADY_ON_ROLE", "This permission is already assigned to the role.");
    }

    role.addPermission(permission);
    return this.roleRepo.update(role);
  }

  public async delete(id: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
    }

    if (role.isDefault) {
      throw this.buildError("ROLE_PROTECTED", "The default role cannot be deleted.");
    }

    await this.userRepo.reassignRole(id, "");

    await this.roleRepo.delete(id);
  }

  public async deactivate(id: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
    }

    if (role.isDefault) {
      throw this.buildError("ROLE_PROTECTED", "The default role cannot be deactivated.");
    }

    if (role.status === "INACTIVE") {
      throw this.buildError("ROLE_ALREADY_INACTIVE", "Role is already inactive.");
    }

    await this.roleRepo.deactivate(id);
  }

  public async reactivate(id: string): Promise<void> {
    const role = await this.roleRepo.findById(id);
    if (!role) {
      throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
    }

    if (role.status === "ACTIVE") {
      throw this.buildError("ROLE_ALREADY_ACTIVE", "Role is already active.");
    }

    await this.roleRepo.reactivate(id);
  }

  public async purgeInactive(): Promise<number> {
    const inactive = await this.roleRepo.findAllInactive();
    const deletable = inactive.filter(r => !r.isDefault);
    await Promise.all(
      deletable.map(async (role) => {
        await this.userRepo.reassignRole(role.roleId, "");
        await this.roleRepo.delete(role.roleId);
      }),
    );
    return deletable.length;
  }

  private normalizeText(value?: string): string | null {
    if (typeof value !== "string") return null;

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private async resolveRolePermissions(application: RoleApplication, permissionIds: string[]): Promise<Permission[]> {
    const resolved: Permission[] = [];

    for (const permId of permissionIds) {
      const perm = await this.permissionRepo.findById(permId);
      if (!perm) {
        throw this.buildError("PERMISSION_NOT_FOUND", `Permission "${permId}" not found.`);
      }

      this.assertPermissionMatchesRoleApplication(application, perm);
      resolved.push(perm);
    }

    return resolved;
  }

  private assertPermissionMatchesRoleApplication(application: RoleApplication, permission: Permission): void {
    if (permission.application !== application) {
      throw this.buildError(
        "PERMISSION_APPLICATION_MISMATCH",
        `Permission "${permission.name}" belongs to "${permission.application}" and cannot be assigned to a "${application}" role.`,
      );
    }
  }

  private buildError(code: string, message: string): RoleServiceError {
    return { code, message };
  }
}
