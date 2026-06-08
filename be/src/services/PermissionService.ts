import { Inject, Service } from "typedi";
import { Permission, PermissionApplication, PermissionCategory } from "../domain/Permission";
import IPermissionRepo from "../repos/IRepos/IPermissionRepo";
import IRoleRepo from "../repos/IRepos/IRoleRepo";
import IPermissionService from "./IServices/IPermissionService";
import IPermissionDTO from "../dto/IPermissionDTO";
import PermissionMapper from "../mappers/PermissionMapper";

export interface PermissionServiceError {
  code: string;
  message: string;
}

@Service()
export default class PermissionService implements IPermissionService {
  constructor(
    @Inject("permissionRepo") private readonly permissionRepo: IPermissionRepo,
    @Inject("roleRepo") private readonly roleRepo: IRoleRepo,
  ) {}

  public async getAll(): Promise<IPermissionDTO[]> {
    const permissions = await this.permissionRepo.findAll();
    return permissions.map((p) => PermissionMapper.toDTO(p));
  }

  public async getAllInactive(): Promise<IPermissionDTO[]> {
    const permissions = await this.permissionRepo.findAllInactive();
    return permissions.map((p) => PermissionMapper.toDTO(p));
  }

  public async getById(id: string): Promise<IPermissionDTO> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw this.buildError("PERMISSION_NOT_FOUND", "Permission not found.");
    }
    return PermissionMapper.toDTO(permission);
  }

  public async create(
    name: string,
    category: PermissionCategory,
    application: PermissionApplication = category === "admin" ? "backoffice" : "just_causes",
  ): Promise<IPermissionDTO> {
    const existing = await this.permissionRepo.findByName(name);
    if (existing) {
      throw this.buildError("PERMISSION_ALREADY_EXISTS", `A permission named "${name}" already exists.`);
    }

    const permResult = Permission.create({ name, status: "ACTIVE", category, application });
    if (permResult.isFailure) {
      throw this.buildError("INVALID_PERMISSION_NAME", permResult.error as string);
    }

    const created = await this.permissionRepo.create(permResult.getValue());
    return PermissionMapper.toDTO(created);
  }

  public async update(
    id: string,
    input: { name?: string; category?: PermissionCategory; application?: PermissionApplication },
  ): Promise<IPermissionDTO> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw this.buildError("PERMISSION_NOT_FOUND", "Permission not found.");
    }

    const oldName = permission.name;

    if (typeof input.name !== "undefined") {
      const existing = await this.permissionRepo.findByName(input.name);
      if (existing && existing.id !== permission.id) {
        throw this.buildError("PERMISSION_ALREADY_EXISTS", `A permission named "${input.name}" already exists.`);
      }
      permission.rename(input.name);
    }

    if (typeof input.category !== "undefined") {
      permission.setCategory(input.category);
    }

    if (typeof input.application !== "undefined") {
      permission.setApplication(input.application);
    }

    const updated = await this.permissionRepo.update(permission);

    if (typeof input.name !== "undefined" && input.name.trim() !== oldName) {
      await this.roleRepo.renamePermissionInAll(oldName, updated.name);
    }

    return PermissionMapper.toDTO(updated);
  }

  public async delete(id: string): Promise<void> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw this.buildError("PERMISSION_NOT_FOUND", "Permission not found.");
    }

    if (permission.status === "INACTIVE") {
      throw this.buildError("PERMISSION_ALREADY_INACTIVE", "Permission is already inactive.");
    }

    await this.permissionRepo.delete(id);
  }

  public async hardDelete(id: string): Promise<void> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw this.buildError("PERMISSION_NOT_FOUND", "Permission not found.");
    }

    await this.permissionRepo.hardDelete(id);
    await this.roleRepo.removePermissionFromAll(permission.name);
  }

  public async hardDeleteAll(): Promise<number> {
    const inactive = await this.permissionRepo.findAllInactive();
    for (const perm of inactive) {
      await this.roleRepo.removePermissionFromAll(perm.name);
      await this.permissionRepo.hardDelete(perm.id);
    }
    return inactive.length;
  }

  public async reactivate(id: string): Promise<IPermissionDTO> {
    const permission = await this.permissionRepo.findById(id);
    if (!permission) {
      throw this.buildError("PERMISSION_NOT_FOUND", "Permission not found.");
    }

    if (permission.status === "ACTIVE") {
      throw this.buildError("PERMISSION_ALREADY_ACTIVE", "Permission is already active.");
    }

    const reactivated = await this.permissionRepo.reactivate(id);
    return PermissionMapper.toDTO(reactivated);
  }

  private buildError(code: string, message: string): PermissionServiceError {
    return { code, message };
  }
}
