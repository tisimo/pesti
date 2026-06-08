import { Inject, Service } from "typedi";
import OjcWithdrawalsRepo, { WithdrawalStatusUpdateResult, WithdrawalsPage } from "../../repos/ojc/OjcWithdrawalsRepo";

@Service()
export default class OjcWithdrawalsService {
  constructor(
    @Inject("ojcWithdrawalsRepo") private readonly repo: OjcWithdrawalsRepo,
  ) {}

  public async listWithdrawals(
    status: string | undefined,
    search: string | undefined,
    onlyJustCauses: boolean,
    page: number,
    pageSize: number,
  ): Promise<WithdrawalsPage> {
    return this.repo.listWithdrawals(status, search, onlyJustCauses, pageSize, (page - 1) * pageSize);
  }

  public async updateStatus(
    withdrawalId: string,
    status: "COMPLETED" | "FAILED",
  ): Promise<WithdrawalStatusUpdateResult | null> {
    return this.repo.updateStatus(withdrawalId, status);
  }
}
