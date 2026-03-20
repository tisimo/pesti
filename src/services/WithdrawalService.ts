import { Inject, Service } from "typedi";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { Result } from "../core/logic/Result";
import {
  WithdrawalDTO,
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
  constructor(
    @Inject(() => WithdrawalRepository) private withdrawalRepository: IWithdrawalRepo,
  ) {}

  public async getAllWithdrawals(accountId: string, page: number): Promise<Result<WithdrawalDTO[]>> {
    try {
      const withdrawals = await this.withdrawalRepository.getAllWithdrawals(accountId, page);

      const withdrawalsDTO = withdrawals.map((withdrawal) => WithdrawalMap.toDTO(withdrawal));

      return Result.ok<WithdrawalDTO[]>(withdrawalsDTO);
    } catch (error) {
      return Result.fail<WithdrawalDTO[]>(error?.message ?? "Error Fetching All Withdrawals!");
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
        addresses: [
          { address: dto.walletAddress, blockchains: ["base"] },
        ],
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

      return Result.ok<GenerateSessionTokenResponseDTO>({ sessionToken: data.token });
    } catch (error) {
      Logger.error(error, "Error generating Coinbase session token");
      return Result.fail<GenerateSessionTokenResponseDTO>(
        error?.message ?? "Error generating session token",
      );
    }
  }

  public async getOfframpTransactionStatus(
    partnerUserRef: string,
  ): Promise<Result<OfframpTransactionRequestDTO>> {
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
      return Result.fail<OfframpTransactionRequestDTO>(
        error?.message ?? "Error fetching transaction status",
      );
    }
  }
}
