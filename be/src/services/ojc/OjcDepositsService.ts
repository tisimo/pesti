import { Inject, Service } from "typedi";
import OjcDepositsRepo, { DepositsPage } from "../../repos/ojc/OjcDepositsRepo";

@Service()
export default class OjcDepositsService {
  constructor(
    @Inject("ojcDepositsRepo") private readonly repo: OjcDepositsRepo,
  ) {}

  public async listDeposits(
    status: string | undefined,
    search: string | undefined,
    onlyJustCauses: boolean,
    page: number,
    pageSize: number,
  ): Promise<DepositsPage> {
    return this.repo.listDeposits(status, search, onlyJustCauses, pageSize, (page - 1) * pageSize);
  }
}
