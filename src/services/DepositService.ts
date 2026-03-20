import { Inject, Service } from "typedi";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { Result } from "../core/logic/Result";
import { CreateDepositRequestDTO, CreateDepositResponseDTO, OnrampQuote } from "../dto/DepositRequestDTO";
import { DepositDTO } from "../dto/DepositDTO";
import IDepositService from "./IServices/IDepositService";
import Logger from "../loaders/logger";
import config from "../../config";
import { IDepositRepo } from "../repos/Deposits/IDepositRepo";
import DepositRepository from "../repos/Deposits/DepositRepo";
import { DepositMap } from "../mappers/DepositMapper";

const CDP_API_HOST = "api.cdp.coinbase.com";
const CDP_ONRAMP_PATH = "/platform/v2/onramp/sessions";
const PURCHASE_CURRENCY = "USDC";
const DESTINATION_NETWORK = "base";

@Service()
export default class DepositService implements IDepositService {
  constructor(
    @Inject(() => DepositRepository) private depositRepository: IDepositRepo,
  ) {}

  public async getAllDeposits(accountId: string, page: number): Promise<Result<DepositDTO[]>> {
    try {
      const deposits = await this.depositRepository.getAllDeposits(accountId, page);

      const depositsDTO = deposits.map(deposit => DepositMap.toDTO(deposit));

      return Result.ok<DepositDTO[]>(depositsDTO);
    } catch (error) {
      return Result.fail<DepositDTO[]>(error?.message ?? "Error Fetching All Deposits!");
    }
  }

  public async getDepositById(depositId: string): Promise<Result<DepositDTO>> {
    try {
      const deposit = await this.depositRepository.getDepositById(depositId);

      if (!deposit) {
        return Result.fail<DepositDTO>("Deposit Not Found!");
      }
      return Result.ok<DepositDTO>(DepositMap.toDTO(deposit));
    } catch (error) {
      Logger.error(error, "Error getting deposit by ID");
      return Result.fail<DepositDTO>(error?.message ?? "Error getting deposit by ID!");
    }
  }

  public async createOnrampSession(
    dto: CreateDepositRequestDTO,
  ): Promise<Result<CreateDepositResponseDTO>> {
    try {
      const depositId = crypto.randomUUID();

      const jwt = await generateJwt({
        apiKeyId: config.cdp.apiKeyId,
        apiKeySecret: config.cdp.apiKeySecret,
        requestMethod: "POST",
        requestHost: CDP_API_HOST,
        requestPath: CDP_ONRAMP_PATH,
        expiresIn: 120,
      });

      const body = {
        destinationAddress: dto.depositAddress,
        purchaseCurrency: PURCHASE_CURRENCY,
        destinationNetwork: DESTINATION_NETWORK,
        paymentAmount: dto.paymentAmount,
        paymentCurrency: dto.paymentCurrency,
        paymentMethod: dto.paymentMethod,
        partnerUserRef: dto.accountId,
      };

      const response = await fetch(`https://${CDP_API_HOST}${CDP_ONRAMP_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as { errorMessage?: string } | null;
        const errorMessage = errorBody?.errorMessage ?? `Coinbase API returned ${response.status}`;
        Logger.error({ status: response.status, errorBody }, "Coinbase onramp session failed");
        return Result.fail<CreateDepositResponseDTO>(errorMessage);
      }

      const data = (await response.json()) as {
        session?: { onrampUrl?: string };
        quote?: OnrampQuote;
      };
      const onrampUrl = data?.session?.onrampUrl;

      if (!onrampUrl) {
        Logger.error({ data }, "Coinbase onramp response missing onrampUrl");
        return Result.fail<CreateDepositResponseDTO>("Invalid response from Coinbase API");
      }

      const deposit = DepositMap.toDomain({
        depositId,
        walletAddress: dto.depositAddress,
        amount: Number(data?.quote?.purchaseAmount ?? dto.paymentAmount),
        amountFiat: Number(dto.paymentAmount),
        currency: dto.paymentCurrency,
        provider: "Coinbase",
        method: dto.paymentMethod,
        application: "Onramp",
        txHash: null,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      });

      await this.depositRepository.createDeposit(deposit);

      return Result.ok<CreateDepositResponseDTO>({
        depositId,
        onrampUrl,
        quote: data.quote ?? undefined,
      });
    } catch (error) {
      Logger.error(error, "Error creating onramp session");
      return Result.fail<CreateDepositResponseDTO>(
        error?.message ?? "Error creating onramp session!",
      );
    }
  }

  public async updateStatus(depositId: string, status: string): Promise<Result<void>> {
    try {
      await this.depositRepository.updateDepositStatus(depositId, status);
      return Result.ok<void>(undefined);
    } catch (error) {
      Logger.error(error, "Error updating deposit status");
      return Result.fail<void>(error?.message ?? "Error updating deposit status!");
    }
  }
}
