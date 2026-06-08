import { Inject, Service } from "typedi";
import OjcTransactionsRepo, { TransactionsPage } from "../../repos/ojc/OjcTransactionsRepo";

@Service()
export default class OjcTransactionsService {
  constructor(@Inject("ojcTransactionsRepo") private readonly repo: OjcTransactionsRepo) {}

  public async listTransactions(
    type: string | undefined,
    status: string | undefined,
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<TransactionsPage> {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    return this.repo.listTransactions(type, status, search, limit, offset);
  }
}
