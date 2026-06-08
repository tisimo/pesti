import { AggregateRoot } from "../core/domain/AggregateRoot";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";
import { UniqueEntityID } from "core/domain/UniqueEntityID";

export interface DepositProps {
    walletAddress: string;
    amount: number;
    amountFiat: number;
    currency: string;
    provider: string;
    method: string;
    application: string;
    txHash: string | null;
    status: "PENDING" | "COMPLETED" | "FAILED";
    createdAt: Date;
}

export class Deposit extends AggregateRoot<DepositProps> {
    get id (): UniqueEntityID{
        return this._id;
    }

    get depositId (): UniqueEntityID{
        return this._id;
    }

    get walletAddress(): string {
        return this.props.walletAddress;
    }

    get amount(): number {
        return this.props.amount;
    }

    get amountFiat(): number {
        return this.props.amountFiat;
    }

    get currency(): string {
        return this.props.currency;
    }
    
    get provider(): string {
        return this.props.provider;
    }

    get method(): string {
        return this.props.method;
    }

    get application(): string {
        return this.props.application;
    }

    get txHash(): string | null {
        return this.props.txHash;
    }

    get status(): "PENDING" | "COMPLETED" | "FAILED" {
        return this.props.status;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    private constructor(props: DepositProps, id?: UniqueEntityID) {
        super(props, id);
    }

    public static create(props: DepositProps, id?: UniqueEntityID): Result<Deposit> {
        const guardResult = [
            {argument: props.walletAddress, argumentName: "walletAddress"},
            {argument: props.amount, argumentName: "amount"},
            {argument: props.amountFiat, argumentName: "amountFiat"},
            {argument: props.currency, argumentName: "currency"},
            {argument: props.provider, argumentName: "provider"},
            {argument: props.method, argumentName: "method"},
            {argument: props.application, argumentName: "application"},
        ];

        const guard = Guard.againstNullOrUndefinedBulk(guardResult);
        if (!guard.succeeded) {
            return Result.fail<Deposit>(guard.message);
        }

        if (typeof props.walletAddress !== "string" || props.walletAddress.length === 0) {
            return Result.fail<Deposit>("Must provide a valid wallet address");
        }

        if (props.amount <= 0) {
            return Result.fail<Deposit>("Amount must be greater than 0");
        }

        if (props.amountFiat <= 0) {
            return Result.fail<Deposit>("Fiat amount must be greater than 0");
        }

        const deposit = new Deposit({...props}, id);
        return Result.ok<Deposit>(deposit);
    }
}