import User, { UserStatus } from "../../domain/User";

export interface CreateUserInput {
  email: string;
  cognitoSub?: string;
  roleId?: string;
  roleIds?: string[];
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
}

export interface UpdateUserInput {
  email?: string;
  roleId?: string;
  roleIds?: string[];
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
}

export interface TransferSuperAdminResult {
  promoted: User;
  demoted: User | null;
}

export default interface IUserService {
  create(input: CreateUserInput): Promise<User>;
  getAll(): Promise<User[]>;
  getById(id: string): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
  deactivate(id: string): Promise<void>;
  reactivate(id: string): Promise<void>;
  purgeInactive(): Promise<number>;
  transferSuperAdmin(toUserId: string): Promise<TransferSuperAdminResult>;
  getMe(userId: string): Promise<{
    user: User;
    roleName: string;
    roleApplication: string;
    roleIsDefault: boolean;
    permissions: string[];
    permissionsByApplication: Record<string, string[]>;
    appsAccessible: string[];
    roles: Array<{ roleId: string; name: string; application: string; isDefault: boolean }>;
  }>;
}
