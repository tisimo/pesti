import { Service } from "typedi";
import { generateJwt } from "@coinbase/cdp-sdk/auth";
import { Result } from "../core/logic/Result";
import { CreateDepositRequestDTO, CreateDepositResponseDTO, OnrampQuote } from "../dto/DepositDTO";
import IDepositService from "./IServices/IDepositService";
import Logger from "../loaders/logger";
import config from "../../config";

const CDP_API_HOST = "api.cdp.coinbase.com";
const CDP_ONRAMP_PATH = "/platform/v2/onramp/sessions";
const PURCHASE_CURRENCY = "USDC";
const DESTINATION_NETWORK = "base";

@Service()
export default class DepositService implements IDepositService {
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
}
