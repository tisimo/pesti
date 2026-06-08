import { Inject, Service } from "typedi";
import IPageGateRepo from "../repos/IRepos/IPageGateRepo";
import IPageGateService from "./IServices/IPageGateService";
import { PageGate } from "../domain/PageGate";

export interface PageGateServiceError {
  code: string;
  message: string;
}

@Service()
export default class PageGateService implements IPageGateService {
  constructor(
    @Inject("pageGateRepo") private readonly pageGateRepo: IPageGateRepo,
  ) {}

  public async getAll(application?: string): Promise<PageGate[]> {
    if (application) {
      return this.pageGateRepo.findByApplication(application);
    }
    return this.pageGateRepo.findAll();
  }

  public async update(gateId: string, requiredPermissions: string[]): Promise<PageGate> {
    const gate = await this.pageGateRepo.findById(gateId);
    if (!gate) {
      throw this.buildError("PAGE_GATE_NOT_FOUND", "Page gate not found.");
    }
    const updated: PageGate = { ...gate, requiredPermissions };
    return this.pageGateRepo.save(updated);
  }

  private buildError(code: string, message: string): PageGateServiceError {
    return { code, message };
  }
}
