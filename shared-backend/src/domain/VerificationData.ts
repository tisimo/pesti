import { AggregateRoot } from "../core/domain/AggregateRoot";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export interface VerificationDataProps {
  firstName?: string;
  lastName?: string;
  birthDate?: Date;
  gender?: string;
  country?: string;
  documentType?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class VerificationData extends AggregateRoot<VerificationDataProps> {
  get id(): UniqueEntityID {
    return this._id;
  }

  get verificationId(): UniqueEntityID {
    return this._id;
  }

  get firstName(): string | undefined {
    return this.props.firstName;
  }

  get lastName(): string | undefined {
    return this.props.lastName;
  }

  get birthDate(): Date | undefined {
    return this.props.birthDate;
  }

  get gender(): string | undefined {
    return this.props.gender;
  }

  get country(): string | undefined {
    return this.props.country;
  }

  get documentType(): string | undefined {
    return this.props.documentType;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  private constructor(props: VerificationDataProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: VerificationDataProps, id?: UniqueEntityID): Result<VerificationData> {
    const guardedProps = [
      { argument: props.createdAt, argumentName: "createdAt" },
      { argument: props.updatedAt, argumentName: "updatedAt" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<VerificationData>(guardResult.message);
    }

    return Result.ok<VerificationData>(new VerificationData({ ...props }, id));
  }
}
