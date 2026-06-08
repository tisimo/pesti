import { AggregateRoot } from "../core/domain/AggregateRoot";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export interface RecoveryCodeProps {
  cognitoSub: string;
  recoveryCode: string;
  createdAt: Date;
}

export class RecoveryCode extends AggregateRoot<RecoveryCodeProps> {
  get id(): UniqueEntityID {
    return this._id;
  }

  get recoveryCodeId(): UniqueEntityID {
    return this._id;
  }

  get cognitoSub(): string {
    return this.props.cognitoSub;
  }

  get recoveryCode(): string {
    return this.props.recoveryCode;
  }

  set recoveryCode(value: string) {
    this.props.recoveryCode = value;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  private constructor(props: RecoveryCodeProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: RecoveryCodeProps, id?: UniqueEntityID): Result<RecoveryCode> {
    const guardedProps = [
      { argument: props.cognitoSub, argumentName: "cognitoSub" },
      { argument: props.recoveryCode, argumentName: "recoveryCode" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<RecoveryCode>(guardResult.message);
    }

    if (typeof props.cognitoSub !== "string" || props.cognitoSub.trim().length === 0) {
      return Result.fail<RecoveryCode>("cognitoSub is empty");
    }

    if (typeof props.recoveryCode !== "string" || props.recoveryCode.trim().length === 0) {
      return Result.fail<RecoveryCode>("recoveryCode is empty");
    }

    const recoveryCode = new RecoveryCode({ ...props }, id);
    return Result.ok<RecoveryCode>(recoveryCode);
  }
}
