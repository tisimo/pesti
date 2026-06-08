import { AdminDeleteUserCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Inject, Service } from "typedi";
import config from "../../config";
import { cognitoClient } from "../loaders/cognito";
import User from "../domain/User";
import IRoleRepo from "../repos/IRepos/IRoleRepo";
import IPermissionRepo from "../repos/IRepos/IPermissionRepo";
import IUserRepo from "../repos/IRepos/IUserRepo";
import IUserService, { CreateUserInput, TransferSuperAdminResult, UpdateUserInput } from "./IServices/IUserService";
import Role from "../domain/Role";
import { buildEffectiveAccess } from "../utils/accessControl";

export interface UserServiceError {
  code: string;
  message: string;
}

@Service()
export default class UserService implements IUserService {
  constructor(
    @Inject("userRepo") private readonly userRepo: IUserRepo,
    @Inject("roleRepo") private readonly roleRepo: IRoleRepo,
    @Inject("permissionRepo") private readonly permissionRepo: IPermissionRepo,
  ) {}

  public async create(input: CreateUserInput): Promise<User> {
    const email = this.normalizeEmail(input.email);

    if (!email) {
      throw this.buildError("INVALID_USER_EMAIL", "User email is invalid.");
    }

    const resolvedRoleIds = await this.resolveAssignableRoleIds(input.roleIds ?? (input.roleId ? [input.roleId] : []));

    const duplicated = await this.userRepo.findByEmail(email);
    if (duplicated) {
      throw this.buildError("USER_ALREADY_EXISTS", "A user with this email already exists.");
    }

    const user = User.create({
      email,
      cognitoSub: input.cognitoSub,
      roleIds: resolvedRoleIds,
      status: input.status,
      firstName: this.normalizeOptionalText(input.firstName),
      lastName: this.normalizeOptionalText(input.lastName),
    });

    return this.userRepo.create(user);
  }

  public async getAll(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  public async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw this.buildError("USER_NOT_FOUND", "User not found.");
    }
    return user;
  }

  public async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw this.buildError("USER_NOT_FOUND", "User not found.");
    }

    if (typeof input.email !== "undefined") {
      const email = this.normalizeEmail(input.email);
      if (!email) {
        throw this.buildError("INVALID_USER_EMAIL", "User email is invalid.");
      }

      const duplicated = await this.userRepo.findByEmail(email);
      if (duplicated && duplicated.userId !== user.userId) {
        throw this.buildError("USER_ALREADY_EXISTS", "A user with this email already exists.");
      }

      user.setEmail(email);
    }

    if (typeof input.roleIds !== "undefined" || typeof input.roleId !== "undefined") {
      const requestedRoleIds = typeof input.roleIds !== "undefined"
        ? input.roleIds
        : input.roleId
          ? [input.roleId]
          : [];
      user.assignRoles(await this.resolveAssignableRoleIds(requestedRoleIds));
    }

    if (typeof input.status !== "undefined") {
      if (input.status === "INACTIVE") {
        user.deactivate();
      } else {
        user.reactivate();
      }
    }

    this.tryApplyProfileUpdates(user, input);

    return this.userRepo.update(user);
  }

  public async delete(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw this.buildError("USER_NOT_FOUND", "User not found.");
    }

    await this.deleteCognitoUser(user.email);
    await this.userRepo.delete(id);
  }

  public async deactivate(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw this.buildError("USER_NOT_FOUND", "User not found.");
    }

    if (user.status === "INACTIVE") {
      throw this.buildError("USER_ALREADY_INACTIVE", "User is already inactive.");
    }

    await this.userRepo.deactivate(id);
  }

  public async reactivate(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw this.buildError("USER_NOT_FOUND", "User not found.");
    }

    if (user.status === "ACTIVE") {
      throw this.buildError("USER_ALREADY_ACTIVE", "User is already active.");
    }

    await this.userRepo.reactivate(id);
  }

  public async transferSuperAdmin(toUserId: string): Promise<TransferSuperAdminResult> {
    const saRole = await this.roleRepo.findByName("Super Admin");
    if (!saRole) {
      throw this.buildError("SUPER_ADMIN_ROLE_NOT_FOUND", "Super Admin role not found.");
    }

    const toUser = await this.userRepo.findById(toUserId);
    if (!toUser) {
      throw this.buildError("USER_NOT_FOUND", "Target user not found.");
    }
    if (toUser.roleIds.includes(saRole.roleId)) {
      throw this.buildError("TARGET_ALREADY_SUPER_ADMIN", "This user is already the Super Admin.");
    }

    // Find the current Super Admin (if any) and demote them
    const allUsers = await this.userRepo.findAll();
    const currentSA = allUsers.find(u => u.roleIds.includes(saRole.roleId) && u.userId !== toUserId) ?? null;

    let demoted: User | null = null;
    if (currentSA) {
      currentSA.assignRoles([]);
      demoted = await this.userRepo.update(currentSA);
    }

    toUser.assignRoles([saRole.roleId]);
    const promoted = await this.userRepo.update(toUser);

    return { promoted, demoted };
  }

  public async purgeInactive(): Promise<number> {
    const inactive = await this.userRepo.findAllInactive();
    await Promise.all(inactive.map(async user => {
      await this.deleteCognitoUser(user.email);
      await this.userRepo.delete(user.userId);
    }));
    return inactive.length;
  }

  public async getMe(userId: string): Promise<{
    user: User;
    roleName: string;
    roleApplication: string;
    roleIsDefault: boolean;
    permissions: string[];
    permissionsByApplication: Record<string, string[]>;
    appsAccessible: string[];
    roles: Array<{ roleId: string; name: string; application: string; isDefault: boolean }>;
  }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw this.buildError("USER_NOT_FOUND", "User not found.");
    }
    const [roles, permissions] = await Promise.all([
      this.resolveRoles(user.roleIds),
      this.permissionRepo.findAll(),
    ]);
    const access = buildEffectiveAccess(roles, permissions);

    return {
      user,
      roleName: access.primaryRole?.name ?? "No access",
      roleApplication: access.primaryRole?.application ?? "",
      roleIsDefault: access.roles.length === 0,
      permissions: access.permissions,
      permissionsByApplication: access.permissionsByApplication,
      appsAccessible: access.appsAccessible,
      roles: access.roles,
    };
  }

  private tryApplyProfileUpdates(user: User, input: UpdateUserInput): void {
    if (typeof input.firstName === "undefined" && typeof input.lastName === "undefined") {
      return;
    }

    const candidate = {
      firstName: typeof input.firstName === "undefined" ? user.firstName : this.normalizeOptionalText(input.firstName),
      lastName: typeof input.lastName === "undefined" ? user.lastName : this.normalizeOptionalText(input.lastName),
    };

    const withProfile = user as unknown as {
      updateProfile?: (profile: { firstName?: string; lastName?: string; avatarUrl?: string | null }) => void;
    };

    if (typeof withProfile.updateProfile === "function") {
      withProfile.updateProfile(candidate);
    }
  }

  private normalizeEmail(value?: string): string | null {
    const normalized = this.normalizeText(value)?.toLowerCase() ?? null;
    if (!normalized) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(normalized) ? normalized : null;
  }

  private normalizeText(value?: string): string | null {
    if (typeof value !== "string") return null;

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  private normalizeOptionalText(value?: string): string | undefined {
    if (typeof value === "undefined") return undefined;

    const normalized = this.normalizeText(value);
    return normalized ?? undefined;
  }

  private async resolveRoles(roleIds: string[]): Promise<Role[]> {
    const roles = await Promise.all(
      roleIds.map(roleId => this.roleRepo.findById(roleId)),
    );
    return roles.filter((role): role is Role => Boolean(role));
  }

  private async resolveAssignableRoleIds(roleIds: string[]): Promise<string[]> {
    const normalizedRoleIds = Array.from(
      new Set(
        roleIds
          .map(roleId => this.normalizeText(roleId))
          .filter((roleId): roleId is string => Boolean(roleId)),
      ),
    );

    if (normalizedRoleIds.length === 0) return [];

    const roles: Role[] = [];
    for (const roleId of normalizedRoleIds) {
      const role = await this.roleRepo.findById(roleId);
      if (!role) {
        throw this.buildError("ROLE_NOT_FOUND", "Role not found.");
      }

      if (role.isDefault) continue;

      if (role.name.toLowerCase() === "super admin") {
        throw this.buildError("SUPER_ADMIN_TRANSFER_REQUIRED", "Super Admin cannot be assigned directly. Use the transfer endpoint.");
      }

      roles.push(role);
    }

    const applications = new Set<string>();
    for (const role of roles) {
      if (applications.has(role.application)) {
        throw this.buildError("ROLE_APPLICATION_DUPLICATE", "A user can only have one role per application.");
      }
      applications.add(role.application);
    }

    if (roles.some(role => role.application === "backoffice") && roles.length > 1) {
      throw this.buildError("BACKOFFICE_ROLE_EXCLUSIVE", "Backoffice roles are global and cannot be combined with application roles.");
    }

    return roles.map(role => role.roleId);
  }

  private normalizeNullableText(value?: string | null): string | null | undefined {
    if (typeof value === "undefined") return undefined;
    if (value === null) return null;

    const normalized = this.normalizeText(value);
    return normalized ?? null;
  }

  private async deleteCognitoUser(email: string): Promise<void> {
    const userPoolId = config.cognitoUserPoolId;
    if (!userPoolId) return;

    try {
      await cognitoClient.send(
        new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: email }),
      );
    } catch (err: any) {
      // Already deleted from Cognito or was never created there — not a hard failure
      if (err?.name !== "UserNotFoundException") {
        throw err;
      }
    }
  }

  private buildError(code: string, message: string): UserServiceError {
    return { code, message };
  }
}
