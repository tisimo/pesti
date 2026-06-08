import { Inject, Service } from "typedi";
import OjcOrganizationsRepo, {
  OrganizationsPage,
  OrganizationProfile,
} from "../../repos/ojc/OjcOrganizationsRepo";

@Service()
export default class OjcOrganizationsService {
  constructor(
    @Inject("ojcOrganizationsRepo") private readonly repo: OjcOrganizationsRepo,
  ) {}

  public async listOrganizations(
    search: string | undefined,
    organizationType: string | undefined,
    accountStatus: string | undefined,
    order: "asc" | "desc",
    page: number,
    pageSize: number,
  ): Promise<OrganizationsPage> {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    return this.repo.listOrganizations(search, organizationType, accountStatus, order, limit, offset);
  }

  public async getOrganizationProfile(profileId: string): Promise<OrganizationProfile | null> {
    return this.repo.getOrganizationProfile(profileId);
  }

  public async updateAccountStatus(
    profileId: string,
    status: "ACTIVE" | "INACTIVE",
  ) {
    return this.repo.updateAccountStatus(profileId, status);
  }
}
