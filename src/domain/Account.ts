import { AggregateRoot } from "../core/domain/AggregateRoot";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export interface AccountProps {
  cognitoSub: string;
  email: string;
  role: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export class Account extends AggregateRoot<AccountProps> {
  get id(): UniqueEntityID {
    return this._id;
  }

  get accountId(): UniqueEntityID {
    return this._id;
  }

  get cognitoSub(): string {
    return this.props.cognitoSub;
  }

  get email(): string {
    return this.props.email;
  }

  get role(): string {
    return this.props.role;
  }

  set role(value: string) {
    this.props.role = value;
  }

  get status(): string {
    return this.props.status;
  }

  set status(value: string) {
    this.props.status = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  set updatedAt(value: Date) {
    this.props.updatedAt = value;
  }

  private constructor(props: AccountProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: AccountProps, id?: UniqueEntityID): Result<Account> {
    const guardedProps = [
      { argument: props.cognitoSub, argumentName: "cognitoSub" },
      { argument: props.email, argumentName: "email" },
      { argument: props.role, argumentName: "role" },
      { argument: props.status, argumentName: "status" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<Account>(guardResult.message);
    }

    if (typeof props.cognitoSub !== "string" || props.cognitoSub.trim().length === 0) {
      return Result.fail<Account>("cognitoSub is empty");
    }

    if (typeof props.email !== "string" || props.email.trim().length === 0) {
      return Result.fail<Account>("email is empty");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(props.email)) {
      return Result.fail<Account>("email is invalid");
    }

    const account = new Account({ ...props }, id);
    return Result.ok<Account>(account);
  }
}
