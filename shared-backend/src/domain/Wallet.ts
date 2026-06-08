import { AggregateRoot } from "../core/domain/AggregateRoot";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export type WalletStatus = "ACTIVE" | "FROZEN" | "INACTIVE";
export interface WalletProps {
  walletAddress: string;
  accountId: string;
  status: WalletStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet extends AggregateRoot<WalletProps> {
  get walletAddress(): string {
    return this.props.walletAddress;
  }

  get accountId(): string {
    return this.props.accountId;
  }

  get status(): WalletStatus {
    return this.props.status;
  }

  set status(value: WalletStatus) {
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

  private constructor(props: WalletProps) {
    super(props);
  }

  public static create(props: WalletProps): Result<Wallet> {
    const guardedProps = [
      { argument: props.walletAddress, argumentName: "walletAddress" },
      { argument: props.accountId, argumentName: "accountId" },
      { argument: props.status, argumentName: "status" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<Wallet>(guardResult.message);
    }

    if (typeof props.walletAddress !== "string" || props.walletAddress.trim().length === 0) {
      return Result.fail<Wallet>("walletAddress is empty");
    }

    const validStatuses: WalletStatus[] = ["ACTIVE", "FROZEN", "INACTIVE"];
    const statusGuard = Guard.isOneOf(props.status, validStatuses, "status");

    if (!statusGuard.succeeded) {
      return Result.fail<Wallet>(statusGuard.message);
    }

    const wallet = new Wallet({ ...props });
    return Result.ok<Wallet>(wallet);
  }
}
