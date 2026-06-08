import { AggregateRoot } from "../core/domain/AggregateRoot";
import { Result } from "../core/logic/Result";
import { Guard } from "../core/logic/Guard";
import { UniqueEntityID } from "core/domain/UniqueEntityID";

export interface WithdrawalProps {
    walletAddress: string;
    amount: number;
    amountFiat: number;
    currency: string;
    fee: number;
    feeTx: string | null;
    provider: string;
    method: string;
    application: string;
    txHash: string | null;
    status: "PENDING" | "COMPLETED" | "FAILED";
    createdAt: string;
}

export class Withdrawal extends AggregateRoot<WithdrawalProps> {
    get id(): UniqueEntityID{
        return this._id;
    }

    get withdrawalId(): UniqueEntityID{
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

    get fee(): number {
        return this.props.fee;
    }

    get feeTx(): string | null {
        return this.props.feeTx;
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

    get createdAt(): string {
        return this.props.createdAt;
    }

    public static create(props: WithdrawalProps, id?: UniqueEntityID): Result<Withdrawal> {
        const guardArgs = [
            {argument: props.walletAddress, argumentName: "walletAddress"},
            {argument: props.amount, argumentName: "amount"},
            {argument: props.amountFiat, argumentName: "amountFiat"},
            {argument: props.currency, argumentName: "currency"},
        ];

        const guard = Guard.againstNullOrUndefinedBulk(guardArgs);
        
        if (!guard.succeeded) {
            return Result.fail<Withdrawal>(guard.message);
        }   

        if(typeof props.walletAddress !== "string" || props.walletAddress.length === 0){
            return Result.fail<Withdrawal>("walletAddress must be a non-empty string");
        }

        if(props.amount <= 0){
            return Result.fail<Withdrawal>("amount must be greater than 0");
        }

        if(props.amountFiat < 0){
            return Result.fail<Withdrawal>("amountFiat cannot be negative");
        }

        const withdrawl = new Withdrawal({...props}, id);
        return Result.ok<Withdrawal>(withdrawl);
    }
}
    
