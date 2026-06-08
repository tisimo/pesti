import { v4 as uuuserIdv4 } from "uuid";

export type UserStatus = "ACTIVE" | "INACTIVE";

export interface UserProps {
  userId: string;
  cognitoSub?: string;
  email: string;
  roleIds: string[];
  status: UserStatus;
  firstName?: string;
  lastName?: string;
}

export interface CreateUserProps {
  userId?: string;
  cognitoSub?: string;
  email: string;
  roleId?: string;
  roleIds?: string[];
  status?: UserStatus;
  firstName?: string;
  lastName?: string;
}

export default class User {
  private props: UserProps;

  private constructor(props: UserProps) {
    this.props = props;
  }

  get userId(): string {
    return this.props.userId;
  }

  get cognitoSub(): string | undefined {
    return this.props.cognitoSub;
  }

  get email(): string {
    return this.props.email;
  }

  get roleId(): string {
    return this.props.roleIds[0] ?? "";
  }

  get roleIds(): string[] {
    return [...this.props.roleIds];
  }

  get status(): UserStatus {
    return this.props.status;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  public setEmail(email: string): void {
    const normalized = this.normalizeEmail(email);
    if (!normalized) {
      throw new Error("User email is invaluserId.");
    }

    this.props.email = normalized;
  }

  public assignRole(roleId: string): void {
    const normalized = this.normalizeText(roleId);
    if (!normalized) {
      throw new Error("roleId is required.");
    }

    this.props.roleIds = [normalized];
  }

  public assignRoles(roleIds: string[]): void {
    const normalized = roleIds
      .map((roleId) => this.normalizeText(roleId))
      .filter((roleId): roleId is string => Boolean(roleId));

    this.props.roleIds = Array.from(new Set(normalized));
  }

  public deactivate(): void {
    this.props.status = "INACTIVE";
  }

  public reactivate(): void {
    this.props.status = "ACTIVE";
  }

  public updateProfile(profile: { firstName?: string; lastName?: string }): void {
    this.props.firstName = profile.firstName;
    this.props.lastName = profile.lastName;
  }

  private normalizeEmail(email: string): string | null {
    const normalized = this.normalizeText(email)?.toLowerCase() ?? null;
    if (!normalized) return null;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(normalized) ? normalized : null;
  }

  private normalizeText(value?: string): string | null {
    if (typeof value !== "string") return null;

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  public static create(props: CreateUserProps): User {
    const roleIds = Array.isArray(props.roleIds) ? props.roleIds : props.roleId ? [props.roleId] : [];
    const user = new User({
      userId: props.userId ?? uuuserIdv4(),
      cognitoSub: props.cognitoSub,
      email: props.email,
      roleIds: [],
      status: props.status ?? "ACTIVE",
      firstName: props.firstName,
      lastName: props.lastName,
    });

    user.setEmail(props.email);
    user.assignRoles(roleIds);

    return user;
  }
}
