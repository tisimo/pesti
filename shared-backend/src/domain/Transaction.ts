import { AggregateRoot } from "../core/domain/AggregateRoot";
import { UniqueEntityID } from "../core/domain/UniqueEntityID";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";

export interface TransactionProps {
  senderAddress: string;
  receiverAddress: string;
  type: number;
  amount: number;
  fiatAmount: number;
  currency: string;
  commission: number;
  rate: number;
  txHash: string;
  token: string;
  createdAt: Date;
}

export class Transaction extends AggregateRoot<TransactionProps> {
  get id(): UniqueEntityID {
    return this._id;
  }

  get transactionId(): UniqueEntityID {
    return this._id;
  }

  get senderAddress(): string {
    return this.props.senderAddress;
  }

  get receiverAddress(): string {
    return this.props.receiverAddress;
  }

  get type(): number {
    return this.props.type;
  }

  get amount(): number {
    return this.props.amount;
  }

  get fiatAmount(): number {
    return this.props.fiatAmount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get commission(): number {
    return this.props.commission;
  }

  get rate(): number {
    return this.props.rate;
  }

  get txHash(): string {
    return this.props.txHash;
  }

  get token(): string {
    return this.props.token;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  private constructor(props: TransactionProps, id?: UniqueEntityID) {
    super(props, id);
  }

  public static create(props: TransactionProps, id?: UniqueEntityID): Result<Transaction> {
    const guardedProps = [
      { argument: props.senderAddress, argumentName: "senderAddress" },
      { argument: props.receiverAddress, argumentName: "receiverAddress" },
      { argument: props.type, argumentName: "type" },
      { argument: props.amount, argumentName: "amount" },
      { argument: props.currency, argumentName: "currency" },
      { argument: props.commission, argumentName: "commission" },
      { argument: props.txHash, argumentName: "txHash" },
      { argument: props.token, argumentName: "token" },
    ];

    const guardResult = Guard.againstNullOrUndefinedBulk(guardedProps);

    if (!guardResult.succeeded) {
      return Result.fail<Transaction>(guardResult.message);
    }

    if (typeof props.senderAddress !== "string" || props.senderAddress.trim().length === 0) {
      return Result.fail<Transaction>("senderAddress is empty");
    }

    if (typeof props.receiverAddress !== "string" || props.receiverAddress.trim().length === 0) {
      return Result.fail<Transaction>("receiverAddress is empty");
    }

    if (typeof props.txHash !== "string" || props.txHash.trim().length === 0) {
      return Result.fail<Transaction>("txHash is empty");
    }

    if (props.amount <= 0) {
      return Result.fail<Transaction>("amount must be greater than 0");
    }

    if (props.fiatAmount <= 0) {
      return Result.fail<Transaction>("fiatAmount must be greater than 0");
    }

    const transaction = new Transaction({ ...props }, id);
    return Result.ok<Transaction>(transaction);
  }
}
