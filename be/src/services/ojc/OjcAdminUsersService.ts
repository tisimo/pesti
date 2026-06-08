import { Inject, Service } from "typedi";
import OjcAdminUsersRepo, { AdminUsersPage } from "../../repos/ojc/OjcAdminUsersRepo";

@Service()
export default class OjcAdminUsersService {
  constructor(@Inject("ojcAdminUsersRepo") private readonly repo: OjcAdminUsersRepo) {}

  public async listAdmins(search: string | undefined, page: number, pageSize: number): Promise<AdminUsersPage> {
    const limit = pageSize;
    const offset = (page - 1) * pageSize;
    return this.repo.listAdmins(search, limit, offset);
  }
}
