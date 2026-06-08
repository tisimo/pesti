import { Inject, Service } from "typedi";
import OjcOverviewRepo, { OverviewStats } from "../../repos/ojc/OjcOverviewRepo";

@Service()
export default class OjcOverviewService {
  constructor(@Inject("ojcOverviewRepo") private readonly repo: OjcOverviewRepo) {}

  public async getStats(): Promise<OverviewStats> {
    return this.repo.getStats();
  }
}
