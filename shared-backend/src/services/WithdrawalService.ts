import { Inject, Service } from "typedi";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { Result } from "../core/logic/Result";
import {
  WithdrawalDTO,
  CreateWithdrawalRequestDTO,
  GenerateSessionTokenRequestDTO,
  GenerateSessionTokenResponseDTO,
  OfframpTransactionRequestDTO,
} from "../dto/WithdrawalDTO";
import IWithdrawalService from "./IServices/IWithdrawalService";
import Logger from "../loaders/logger";
import config from "../../config";
import { IWithdrawalRepo } from "../repos/Withdrawals/IWithdrawalRepo";
import WithdrawalRepository from "../repos/Withdrawals/WithdrawalRepo";
import { WithdrawalMap } from "../mappers/WithdrawalMapper";

const COINBASE_API_HOST = "api.developer.coinbase.com";
const TOKEN_PATH = "/onramp/v1/token";

@Service()
export default class WithdrawalService implements IWithdrawalService {
  constructor(@Inject(() => WithdrawalRepository) private withdrawalRepository: IWithdrawalRepo) {}

  public async getAllWithdrawals(accountId: string, page: number): Promise<Result<WithdrawalDTO[]>> {
    try {
      const withdrawals = await this.withdrawalRepository.getAllWithdrawals(accountId, page);

      const withdrawalsDTO = withdrawals.map(withdrawal => WithdrawalMap.toDTO(withdrawal));

      return Result.ok<WithdrawalDTO[]>(withdrawalsDTO);
    } catch (error) {
      return Result.fail<WithdrawalDTO[]>(error?.message ?? "Error Fetching All Withdrawals!");
    }
  }

  public async getWithdrawalById(withdrawalId: string): Promise<Result<WithdrawalDTO>> {
    try {
      const withdrawal = await this.withdrawalRepository.getWithdrawalById(withdrawalId);

      if (!withdrawal) {
        return Result.fail<WithdrawalDTO>("Withdrawal Not Found!");
      }

      return Result.ok<WithdrawalDTO>(WithdrawalMap.toDTO(withdrawal));
    } catch (error) {
      Logger.error(error, "Error getting withdrawal by ID");
      return Result.fail<WithdrawalDTO>(error?.message ?? "Error getting withdrawal by ID!");
    }
  }

  public async createWithdrawal(dto: CreateWithdrawalRequestDTO): Promise<Result<WithdrawalDTO>> {
    try {
      const withdrawalId = crypto.randomUUID();

      const withdrawal = WithdrawalMap.toDomain({
        withdrawalId,
        walletAddress: dto.walletAddress,
        amount: dto.amount,
        amountFiat: dto.amountFiat,
        currency: dto.currency,
        fee: dto.fee,
        feeTx: dto.feeTx,
        provider: dto.provider,
        method: dto.method,
        application: dto.application,
        txHash: dto.txHash,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });

      const saved = await this.withdrawalRepository.createWithdrawal(withdrawal);

      return Result.ok<WithdrawalDTO>(WithdrawalMap.toDTO(saved));
    } catch (error) {
      Logger.error(error, "Error creating withdrawal");
      return Result.fail<WithdrawalDTO>(error?.message ?? "Error creating withdrawal!");
    }
  }

  public async confirmWithdrawal(walletAddress: string, txHash: string): Promise<Result<void>> {
    try {
      const withdrawal = await this.withdrawalRepository.getLatestPendingWithdrawal(walletAddress);

      if (!withdrawal) {
        Logger.warn({ walletAddress, txHash }, "No pending withdrawal found for wallet — skipping confirmation");
        return Result.ok<void>(undefined);
      }

      const withdrawalId = withdrawal.withdrawalId.toString();
      await this.withdrawalRepository.updateWithdrawalStatus(withdrawalId, "COMPLETED", txHash);
      Logger.info({ withdrawalId, walletAddress, txHash }, "Withdrawal confirmed via on-chain event");
      return Result.ok<void>(undefined);
    } catch (error) {
      Logger.error(error, "Error confirming withdrawal");
      return Result.fail<void>(error?.message ?? "Error confirming withdrawal");
    }
  }

  public async updateStatus(withdrawalId: string, status: string): Promise<Result<void>> {
    try {
      await this.withdrawalRepository.updateWithdrawalStatus(withdrawalId, status);
      return Result.ok<void>(undefined);
    } catch (error) {
      Logger.error(error, "Error updating withdrawal status");
      return Result.fail<void>(error?.message ?? "Error updating withdrawal status!");
    }
  }

  public async generateSessionToken(
    dto: GenerateSessionTokenRequestDTO,
  ): Promise<Result<GenerateSessionTokenResponseDTO>> {
    try {
      const jwt = await generateJwt({
        apiKeyId: config.cdp.apiKeyId,
        apiKeySecret: config.cdp.apiKeySecret,
        requestMethod: "POST",
        requestHost: COINBASE_API_HOST,
        requestPath: TOKEN_PATH,
        expiresIn: 120,
      });

      const body = {
        addresses: [{ address: dto.walletAddress, blockchains: ["base"] }],
      };

      const response = await fetch(`https://${COINBASE_API_HOST}${TOKEN_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        const errorMessage = errorBody?.message ?? `Coinbase API returned ${response.status}`;
        Logger.error({ status: response.status, errorBody }, "Coinbase session token generation failed");
        return Result.fail<GenerateSessionTokenResponseDTO>(errorMessage);
      }

      const data = (await response.json()) as { token?: string };

      if (!data?.token) {
        Logger.error({ data }, "Coinbase token response missing token");
        return Result.fail<GenerateSessionTokenResponseDTO>("Invalid response from Coinbase API");
      }

      const withdrawalId = crypto.randomUUID();

      const withdrawal = WithdrawalMap.toDomain({
        withdrawalId,
        walletAddress: dto.walletAddress,
        amount: dto.amount,
        amountFiat: 0,
        currency: dto.currency,
        fee: dto.fee,
        feeTx: null,
        provider: "Coinbase",
        method: "Offramp",
        application: "OnlyJustCauses",
        txHash: null,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });

      await this.withdrawalRepository.createWithdrawal(withdrawal);

      return Result.ok<GenerateSessionTokenResponseDTO>({ sessionToken: data.token, withdrawalId });
    } catch (error) {
      Logger.error(error, "Error generating Coinbase session token");
      return Result.fail<GenerateSessionTokenResponseDTO>(error?.message ?? "Error generating session token");
    }
  }

  public async getOfframpTransactionStatus(partnerUserRef: string): Promise<Result<OfframpTransactionRequestDTO>> {
    try {
      const sellPath = `/onramp/v1/sell/user/${partnerUserRef}/transactions`;

      const jwt = await generateJwt({
        apiKeyId: config.cdp.apiKeyId,
        apiKeySecret: config.cdp.apiKeySecret,
        requestMethod: "GET",
        requestHost: COINBASE_API_HOST,
        requestPath: sellPath,
        expiresIn: 120,
      });

      const response = await fetch(`https://${COINBASE_API_HOST}${sellPath}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { message?: string } | null;
        const errorMessage = errorBody?.message ?? `Coinbase API returned ${response.status}`;
        Logger.error({ status: response.status, errorBody }, "Coinbase offramp status fetch failed");
        return Result.fail<OfframpTransactionRequestDTO>(errorMessage);
      }

      const data = (await response.json()) as { transactions?: OfframpTransactionRequestDTO[] };
      const transactions = data?.transactions;

      if (!transactions || transactions.length === 0) {
        return Result.fail<OfframpTransactionRequestDTO>("No offramp transactions found");
      }

      return Result.ok<OfframpTransactionRequestDTO>(transactions[0]);
    } catch (error) {
      Logger.error(error, "Error fetching offramp transaction status");
      return Result.fail<OfframpTransactionRequestDTO>(error?.message ?? "Error fetching transaction status");
    }
  }
}
