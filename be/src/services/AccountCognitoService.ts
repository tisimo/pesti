import { AdminCreateUserCommand, AdminResetUserPasswordCommand, ListUsersCommand } from "@aws-sdk/client-cognito-identity-provider";
import { Inject, Service } from "typedi";
import config from "../../config";
import { cognitoClient } from "../loaders/cognito";
import type IAccountCognitoService from "./IServices/IAccountCognitoService";
import type { CreateAccountCognitoInput, CreateAccountCognitoResult } from "./IServices/IAccountCognitoService";
import IUserRepo from "../repos/IRepos/IUserRepo";
import IRoleRepo from "../repos/IRepos/IRoleRepo";
import User from "../domain/User";
import UserMapper from "../mappers/UserMapper";

export interface AccountCognitoServiceError {
  code: string;
  message: string;
}

@Service()
export default class AccountCognitoService implements IAccountCognitoService {
  constructor(
    @Inject("userRepo") private readonly userRepo: IUserRepo,
    @Inject("roleRepo") private readonly roleRepo: IRoleRepo,
  ) {}

  public async create(input: CreateAccountCognitoInput): Promise<CreateAccountCognitoResult> {
    const userPoolId = config.cognitoUserPoolId;
    if (!userPoolId) {
      throw this.buildError("COGNITO_CONFIG_MISSING", "Cognito user pool id is missing.");
    }

    const email = this.normalizeEmail(input.email);
    if (!email) {
      throw this.buildError("INVALID_ACCOUNT_EMAIL", "Email is required and must be valid.");
    }

    const duplicated = await this.userRepo.findByEmail(email);
    if (duplicated) {
      throw this.buildError("BACKOFFICE_USER_ALREADY_EXISTS", "A backoffice user with this email already exists.");
    }

    const defaultRole = await this.roleRepo.findDefault();
    if (!defaultRole) {
      throw this.buildError("DEFAULT_ROLE_NOT_FOUND", "No default role configured. Please seed the database.");
    }

    // Step 1: Create Cognito user
    let cognitoSub: string | undefined;
    try {
      const command = new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        UserAttributes: [
          { Name: "email", Value: email },
          { Name: "email_verified", Value: "true" },
        ],
      });
      const result = await cognitoClient.send(command);
      cognitoSub = result.User?.Attributes?.find(attr => attr.Name === "sub")?.Value;
    } catch (error: any) {
      if (error?.name === "UsernameExistsException") {
        throw this.buildError("ACCOUNT_ALREADY_EXISTS", "A Cognito user with this email already exists.");
      }
      throw error;
    }

    // Step 2: Create BO_Users record linked to Cognito sub
    const user = User.create({
      email,
      cognitoSub,
      roleIds: [],
      firstName: input.firstName?.trim() || undefined,
      lastName: input.lastName?.trim() || undefined,
    });

    const saved = await this.userRepo.create(user);
    const dto = UserMapper.toDTO(saved);

    return {
      userId: dto.userId,
      cognitoSub: dto.cognitoSub,
      email: dto.email,
      roleId: defaultRole.roleId,
      roleIds: dto.roleIds,
      status: dto.status,
      firstName: dto.firstName,
      lastName: dto.lastName,
    };
  }

  public async list() {
    const command = new ListUsersCommand({
      UserPoolId: config.cognitoUserPoolId,
    });

    const result = await cognitoClient.send(command);

    return (
      result.Users?.map(user => {
        const attrs = Object.fromEntries((user.Attributes ?? []).map(a => [a.Name!, a.Value]));
        return {
          cognitoSub: attrs.sub,
          email: attrs.email,
          status: user.Enabled ? "ACTIVE" : "INACTIVE",
          userStatus: user.UserStatus,
        };
      }) ?? []
    );
  }

  public async resetPassword(email: string): Promise<void> {
    const userPoolId = config.cognitoUserPoolId;
    if (!userPoolId) {
      throw this.buildError("COGNITO_CONFIG_MISSING", "Cognito user pool id is missing.");
    }
    const command = new AdminResetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
    });
    await cognitoClient.send(command);
  }

  private normalizeEmail(value?: string): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(normalized) ? normalized : null;
  }

  private buildError(code: string, message: string): AccountCognitoServiceError {
    return { code, message };
  }
}
