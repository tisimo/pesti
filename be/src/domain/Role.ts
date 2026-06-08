import { v4 as uuidv4 } from "uuid";
import { Permission } from "../domain/Permission";

export type RoleStatus = "ACTIVE" | "INACTIVE";
export type RoleApplication = "backoffice" | "just_causes";

export interface RoleProps {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  status: RoleStatus;
  application: RoleApplication;
  isDefault: boolean;
}

export interface CreateRoleProps {
  id?: string;
  name: string;
  description?: string;
  permissions?: Permission[];
  status?: RoleStatus;
  application?: RoleApplication;
  isDefault?: boolean;
}

export default class Role {
  private props: RoleProps;

  private constructor(props: RoleProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  get roleId(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string | undefined {
    return this.props.description;
  }

  get permissions(): Permission[] {
    return this.props.permissions;
  }

  get application(): RoleApplication {
    return this.props.application;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  public rename(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error("Role name cannot be empty");
    }

    this.props.name = name;
  }

  public addPermission(permission: Permission): void {
    if (!this.props.permissions.some(p => p.id === permission.id)) {
      this.props.permissions.push(permission);
    }
  }

  public removePermission(permissionId: string): void {
    this.props.permissions = this.props.permissions.filter(p => p.id !== permissionId);
  }

  public setPermissions(permissions: Permission[]): void {
    this.props.permissions = permissions;
  }

  get status(): RoleStatus {
    return this.props.status;
  }

  public deactivate(): void {
    this.props.status = "INACTIVE";
  }

  public setDescription(description: string | undefined): void {
    this.props.description = description;
  }

  public setApplication(application: RoleApplication): void {
    this.props.application = application;
  }

  public static create(props: CreateRoleProps): Role {
    return new Role({
      id: props.id ?? uuidv4(),
      name: props.name,
      description: props.description,
      permissions: props.permissions ?? [],
      status: props.status ?? "ACTIVE",
      application: props.application ?? "just_causes",
      isDefault: props.isDefault ?? false,
    });
  }
}
