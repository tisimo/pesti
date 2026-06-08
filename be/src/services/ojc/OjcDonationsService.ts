import { Inject, Service } from "typedi";
import OjcDonationsRepo, { DonationsPage } from "../../repos/ojc/OjcDonationsRepo";

@Service()
export default class OjcDonationsService {
  constructor(@Inject("ojcDonationsRepo") private readonly repo: OjcDonationsRepo) {}

  public async listDonations(
    status: string | undefined,
    search: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<DonationsPage> {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    return this.repo.listDonations(status, search, limit, offset);
  }
}
