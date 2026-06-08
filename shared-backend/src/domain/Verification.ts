import { AggregateRoot } from "../core/domain/AggregateRoot";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export type VerificationStatus = "PENDING" | "VERIFIED" | "DECLINED";

export interface VerificationProps {
  accountId: string;
  status: VerificationStatus;
  veriffSessionId?: string;
  verifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Verification extends AggregateRoot<VerificationProps> {
  get id(): UniqueEntityID {
    return this._id;
  }

  get verificationId(): UniqueEntityID {
    return this._id;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get status(): VerificationStatus {
    return this.props.status;
  }

  get veriffSessionId(): string | undefined {
    return this.props.veriffSessionId;
  }

  get verifiedAt(): Date | undefined {
    return this.props.verifiedAt;
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

  private constructor(props: VerificationProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public updateSessionId(sessionId: string): void {
    this.props.veriffSessionId = sessionId;
    this.props.updatedAt = new Date();
  }

  public markVerified(sessionId: string): void {
    this.props.status = "VERIFIED";
    this.props.veriffSessionId = sessionId;
    this.props.verifiedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public markDeclined(sessionId: string): void {
    this.props.status = "DECLINED";
    this.props.veriffSessionId = sessionId;
    this.props.updatedAt = new Date();
  }

  public static create(props: VerificationProps, id?: UniqueEntityID): Result<Verification> {
    const guardedProps = [
      { argument: props.accountId, argumentName: "accountId" },
      { argument: props.status, argumentName: "status" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<Verification>(guardResult.message);
    }

    const validStatuses: VerificationStatus[] = ["PENDING", "VERIFIED", "DECLINED"];
    if (!validStatuses.includes(props.status)) {
      return Result.fail<Verification>(`Invalid verification status: ${props.status}`);
    }

    return Result.ok<Verification>(new Verification({ ...props }, id));
  }
}
