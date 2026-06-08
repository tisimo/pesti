import { Entity } from "../core/domain/Entity";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export type PermissionStatus = "ACTIVE" | "INACTIVE";
export type PermissionCategory = "view" | "action" | "admin";
export type PermissionApplication = "backoffice" | "just_causes";

export interface PermissionProps {
  name: string;
  status: PermissionStatus;
  category: PermissionCategory;
  application?: PermissionApplication;
}

export class Permission extends Entity<PermissionProps> {
  get id(): string {
    return this._id.toValue() as string;
  }

  get name(): string {
    return this.props.name;
  }

  get status(): PermissionStatus {
    return this.props.status;
  }

  get category(): PermissionCategory {
    return this.props.category;
  }

  get application(): PermissionApplication {
    return this.props.application ?? (this.props.category === "admin" ? "backoffice" : "just_causes");
  }

  public deactivate(): void {
    this.props.status = "INACTIVE";
  }

  public rename(name: string): void {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Permission name cannot be empty.");
    this.props.name = trimmed;
  }

  public setCategory(category: PermissionCategory): void {
    this.props.category = category;
  }

  public setApplication(application: PermissionApplication): void {
    this.props.application = application;
  }

  private constructor(props: PermissionProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: PermissionProps, id?: UniqueEntityID): Result<Permission> {
    const guard = Guard.againstNullOrUndefined(props.name, "name");
    if (!guard.succeeded) return Result.fail<Permission>(guard.message);

    const trimmed = props.name.trim();
    if (!trimmed) return Result.fail<Permission>("Permission name cannot be empty.");

    return Result.ok<Permission>(
      new Permission(
        {
          name: trimmed,
          status: props.status ?? "ACTIVE",
          category: props.category,
          application: props.application ?? (props.category === "admin" ? "backoffice" : "just_causes"),
        },
        id,
      )
    );
  }
}
